import sql from 'mssql';

const config: sql.config = {
  server: 'v2devsqlserver.database.windows.net',
  port: 1433,
  database: 'v2dev',
  user: 'dbRead',
  password: 'Domino00%',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function testConnection() {
  try {
    const connection = await getConnection();
    const result = await connection.request().query('SELECT 1 AS test');
    return { success: true, message: 'Connexion réussie', data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

