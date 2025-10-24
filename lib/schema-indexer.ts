import { getConnection } from './db';
import { getDatabase } from './mongodb';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  enumValues?: string[]; // Valeurs possibles si c'est une colonne enum
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface DatabaseSchema {
  tables: TableInfo[];
  indexedAt: Date;
  version: string;
}

export async function indexDatabase(): Promise<DatabaseSchema> {
  const connection = await getConnection();
  
  // Récupérer toutes les tables
  const tablesResult = await connection.request().query(`
    SELECT 
      TABLE_SCHEMA,
      TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);

  const tables: TableInfo[] = [];

  for (const table of tablesResult.recordset) {
    const schema = table.TABLE_SCHEMA;
    const tableName = table.TABLE_NAME;

    // Récupérer les colonnes avec leurs infos détaillées
    const columnsResult = await connection.request().query(`
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
        CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_FOREIGN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
          AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
      ) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA 
        AND c.TABLE_NAME = pk.TABLE_NAME 
        AND c.COLUMN_NAME = pk.COLUMN_NAME
      LEFT JOIN (
        SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_TYPE = 'FOREIGN KEY' 
          AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
      ) fk ON c.TABLE_SCHEMA = fk.TABLE_SCHEMA 
        AND c.TABLE_NAME = fk.TABLE_NAME 
        AND c.COLUMN_NAME = fk.COLUMN_NAME
      WHERE c.TABLE_SCHEMA = '${schema}' AND c.TABLE_NAME = '${tableName}'
      ORDER BY c.ORDINAL_POSITION
    `);

    // Compter les lignes
    let rowCount = 0;
    try {
      const countResult = await connection.request().query(`
        SELECT COUNT(*) as cnt FROM [${schema}].[${tableName}]
      `);
      rowCount = countResult.recordset[0].cnt;
    } catch (error) {
      console.error(`Erreur comptage ${schema}.${tableName}:`, error);
    }

    const columns: ColumnInfo[] = [];
    
    for (const col of columnsResult.recordset) {
      const columnInfo: ColumnInfo = {
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        isPrimaryKey: col.IS_PRIMARY_KEY === 1,
        isForeignKey: col.IS_FOREIGN_KEY === 1,
        defaultValue: col.COLUMN_DEFAULT,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
      };

      // Détecter si c'est une colonne enum potentielle
      const columnName = col.COLUMN_NAME.toLowerCase();
      const hasEnumName =
        columnName.includes('status') ||
        columnName.includes('type') ||
        columnName.includes('code') ||
        columnName.includes('state') ||
        columnName.includes('category') ||
        columnName.includes('level') ||
        columnName.includes('priority') ||
        columnName.includes('role') ||
        columnName.includes('gender') ||
        columnName.includes('country') ||
        columnName.includes('language');

      const isStringType = col.DATA_TYPE === 'varchar' || col.DATA_TYPE === 'nvarchar' || col.DATA_TYPE === 'char';
      
      // Si le nom suggère une enum OU si c'est un string court, vérifier les valeurs
      if ((hasEnumName || (isStringType && col.CHARACTER_MAXIMUM_LENGTH && col.CHARACTER_MAXIMUM_LENGTH <= 50)) && rowCount > 0) {
        try {
          // Compter les valeurs distinctes
          const distinctCountResult = await connection.request().query(`
            SELECT COUNT(DISTINCT [${col.COLUMN_NAME}]) as distinctCount
            FROM [${schema}].[${tableName}]
            WHERE [${col.COLUMN_NAME}] IS NOT NULL
          `);

          const distinctCount = distinctCountResult.recordset[0].distinctCount;

          // C'est une enum si :
          // 1. Nom suggère une enum ET <= 100 valeurs distinctes
          // 2. OU ratio distinct/total < 5% ET <= 50 valeurs distinctes
          const isEnum = 
            (hasEnumName && distinctCount <= 100) ||
            (distinctCount <= 50 && distinctCount > 0 && (distinctCount / rowCount) < 0.05);

          if (isEnum) {
            // Récupérer les valeurs distinctes
            const enumResult = await connection.request().query(`
              SELECT DISTINCT TOP ${distinctCount} [${col.COLUMN_NAME}] as value
              FROM [${schema}].[${tableName}]
              WHERE [${col.COLUMN_NAME}] IS NOT NULL
              ORDER BY [${col.COLUMN_NAME}]
            `);

            if (enumResult.recordset && enumResult.recordset.length > 0) {
              columnInfo.enumValues = enumResult.recordset
                .map((row) => row.value)
                .filter((v) => v !== null && v !== '' && typeof v === 'string')
                .slice(0, 100); // Limite à 100 valeurs max
            }
          }
        } catch (error) {
          // Ignorer les erreurs sur les colonnes problématiques
          console.error(`Erreur enum pour ${schema}.${tableName}.${col.COLUMN_NAME}:`, error);
        }
      }

      columns.push(columnInfo);
    }

    tables.push({
      name: tableName,
      schema: schema,
      columns: columns,
      rowCount: rowCount,
    });
  }

  const schema: DatabaseSchema = {
    tables,
    indexedAt: new Date(),
    version: '1.0',
  };

  // Sauvegarder dans MongoDB
  const db = await getDatabase();
  await db.collection('schemas').deleteMany({});
  await db.collection('schemas').insertOne(schema);

  return schema;
}

export async function getSchema(): Promise<DatabaseSchema | null> {
  const db = await getDatabase();
  const schema = await db.collection('schemas').findOne({});
  return schema as DatabaseSchema | null;
}

export function generateSchemaPrompt(schema: DatabaseSchema): string {
  let prompt = `# Base de données SQL Server - Schéma complet\n\n`;
  prompt += `Indexé le: ${schema.indexedAt.toLocaleString('fr-FR')}\n\n`;
  prompt += `## Tables (${schema.tables.length} tables)\n\n`;

  for (const table of schema.tables) {
    prompt += `### ${table.schema}.${table.name} (${table.rowCount.toLocaleString()} lignes)\n\n`;
    prompt += `| Colonne | Type | Nullable | PK | FK | Valeurs possibles |\n`;
    prompt += `|---------|------|----------|----|----|-------------------|\n`;
    
    for (const col of table.columns) {
      const possibleValues = col.enumValues && col.enumValues.length > 0
        ? col.enumValues.slice(0, 20).map(v => `'${v}'`).join(', ')
        : '-';
      
      prompt += `| ${col.name} | ${col.type} | ${col.nullable ? '✓' : '✗'} | ${col.isPrimaryKey ? '✓' : '✗'} | ${col.isForeignKey ? '✓' : '✗'} | ${possibleValues} |\n`;
    }
    
    prompt += `\n`;
  }

  return prompt;
}

