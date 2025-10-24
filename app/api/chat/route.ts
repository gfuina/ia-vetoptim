import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSchema, generateSchemaPrompt } from '@/lib/schema-indexer';
import { getConnection } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    // Vérifier que le schéma est indexé
    const schema = await getSchema();
    if (!schema) {
      return NextResponse.json(
        {
          success: false,
          message: "Base de données non indexée. Veuillez d'abord indexer la base.",
        },
        { status: 400 }
      );
    }

    // Générer le prompt avec le schéma
    const schemaPrompt = generateSchemaPrompt(schema);

    // Construire l'historique de conversation pour OpenAI
    const systemPrompt = `Tu es un assistant IA expert en SQL Server qui aide les utilisateurs à interroger leur base de données.

${schemaPrompt}

VOCABULAIRE MÉTIER IMPORTANT:
- Les "clients" sont stockés dans la table JuridicalEntities (entités juridiques)
- Les "signataires" sont stockés dans la table Persons (personnes physiques)
- Les "Broker" et "RegionBroker" sont des Collaborators (collaborateurs/courtiers)
- Quand l'utilisateur dit "client", cherche dans JuridicalEntities
- Quand l'utilisateur dit "signataire", cherche dans Persons
- Quand l'utilisateur dit "broker" ou "courtier", cherche dans Collaborators

COMPORTEMENT:
1. Si la question nécessite des données de la base:
   - Génère IMMÉDIATEMENT la requête SQL sans longue explication préalable
   - Commence ta réponse par "SQL:" suivi de la requête
   - NE décris PAS ton raisonnement SQL (l'utilisateur ne veut pas les détails techniques)
   - Si besoin de clarifier un choix, fais-le en UNE phrase courte après le SQL

2. Si la question est une demande d'explication, de clarification, ou de suivi conversationnel:
   - Réponds en langage naturel de manière concise
   - Réfère-toi aux requêtes précédentes si nécessaire
   - NE génère PAS de SQL si ce n'est pas nécessaire

RÈGLES SQL:
- Utilise UNIQUEMENT les tables/colonnes du schéma ci-dessus
- Limite à 100 lignes (TOP 100)
- TOUJOURS faire des JOINs pour remplacer les IDs par des infos lisibles
- TRÈS IMPORTANT: Pour les colonnes avec "Valeurs possibles", utilise UNIQUEMENT ces valeurs exactes
- Si une colonne StatusCode a les valeurs 'ACTIVE', 'PENDING', n'utilise JAMAIS 'Completed' ou autre chose
- Respecte la casse exacte des valeurs enum (ACTIVE vs Active vs active)

COLONNES À INCLURE (OBLIGATOIRE):
Quand tu retournes une personne/entité, inclus TOUJOURS le maximum d'infos pertinentes:
- Pour Collaborators: FirstName, LastName, Email, Phone, Mobile, Function/Role, CompanyName
- Pour JuridicalEntities (clients): CompanyName, Email, Phone, Address, City, PostalCode, Country, StatusCode
- Pour Persons (signataires): FirstName, LastName, Email, Phone, Mobile, BirthDate, Gender
- Pour Projects: Title, StatusCode, StartDate, EndDate, Budget, Description
- Pour Contracts: Title, StatusCode, StartDate, EndDate, Amount, CustomerName
- Utilise des alias descriptifs et clairs (BrokerFirstName, BrokerEmail, ClientCompanyName, etc.)
- Ne te limite PAS à juste le nom + un compteur, donne le contexte complet

Format de réponse SQL (IMPORTANT):
SQL: [ta requête SQL sur UNE SEULE LIGNE, SANS balises markdown, juste le SQL pur]
[Si nécessaire: UNE phrase d'explication simple, sans détails techniques]

Exemples de format correct:
✅ Bon (concis):
SQL: SELECT TOP 10 c.Name, c.Email FROM Customers c ORDER BY c.CreateDate DESC
Derniers clients ajoutés.

❌ Mauvais (trop verbeux):
SQL: SELECT TOP 10 c.Name, c.Email FROM Customers c ORDER BY c.CreateDate DESC
Pour déterminer les derniers clients, nous devons trier par date de création en ordre décroissant et limiter à 10 résultats. Cette requête va chercher dans la table Customers...

Exemples:
❌ "Quel est le meilleur contrat?" → Tu ne peux pas deviner ce qui est "meilleur" sans critère
✅ "Quel est le contrat le plus récent?" → Tu peux trier par date
❌ SELECT ContractId → Mauvais, retourne aussi le nom du client
✅ SELECT c.Name, co.Title → Bon, données lisibles`;

    const conversationMessages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Ajouter l'historique
    history.forEach((msg: any) => {
      if (msg.role === 'user') {
        conversationMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        let assistantContent = msg.content;
        if (msg.sql) {
          assistantContent = `SQL: ${msg.sql}\n${msg.content}`;
        }
        conversationMessages.push({ role: 'assistant', content: assistantContent });
      }
    });

    // Ajouter le message actuel
    conversationMessages.push({ role: 'user', content: message });

    // Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationMessages,
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content?.trim() || '';

    console.log('🤖 Réponse OpenAI:', response);

    // Vérifier si c'est une réponse SQL ou conversationnelle
    if (response.startsWith('SQL:')) {
      // Extraire le SQL (peut être entouré de ```sql```)
      let sqlQuery = '';
      let explanation = '';

      // Chercher le SQL entre balises markdown ou directement
      const sqlBlockMatch = response.match(/```sql\s*([\s\S]*?)```/);
      if (sqlBlockMatch) {
        // SQL dans des balises markdown
        sqlQuery = sqlBlockMatch[1].trim();
        // Explication = tout ce qui est après les balises
        const afterSql = response.split('```').slice(2).join('').trim();
        explanation = afterSql;
      } else {
        // SQL sans balises (format original attendu)
        const parts = response.split('\n');
        sqlQuery = parts[0].replace('SQL:', '').trim();
        explanation = parts.slice(1).join('\n').trim();
      }

      console.log('🔍 SQL généré:', sqlQuery);

      try {
        // Exécuter la requête SQL
        const connection = await getConnection();
        const result = await connection.request().query(sqlQuery);

        console.log('✅ Résultat SQL:', {
          recordset: result.recordset ? `${result.recordset.length} lignes` : 'undefined',
          rowsAffected: result.rowsAffected,
        });

        // Vérifier que recordset existe
        if (!result || !result.recordset) {
          return NextResponse.json(
            {
              success: false,
              message: 'La requête SQL n\'a retourné aucun résultat valide',
              sql: sqlQuery,
              debug: `Result: ${JSON.stringify(result)}`,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          sql: sqlQuery,
          data: result.recordset,
          rowCount: result.recordset.length,
          explanation: explanation || `J'ai trouvé ${result.recordset.length} résultat(s)`,
        });
      } catch (sqlError) {
        // Erreur d'exécution SQL
        const errorMessage = sqlError instanceof Error ? sqlError.message : 'Erreur inconnue';
        
        // Détecter l'erreur de firewall Azure
        if (errorMessage.includes('not allowed to access the server') || errorMessage.includes('firewall')) {
          const ipMatch = errorMessage.match(/IP address '([^']+)'/);
          const ip = ipMatch ? ipMatch[1] : 'votre IP';
          
          return NextResponse.json(
            {
              success: false,
              message: `🚫 Oups ! Le serveur Azure fait la gueule... 

Ton IP (${ip}) n'est pas sur la liste VIP du firewall ! 🎭

👉 Va sur le portail Azure et ajoute cette IP à la whitelist du serveur SQL.
(Ou demande gentiment à un admin de le faire pour toi)

PS : Ça peut prendre jusqu'à 5 minutes pour que ça prenne effet, alors va te chercher un café ☕`,
              sql: sqlQuery,
              isFirewallError: true,
            },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          {
            success: false,
            message: `Erreur SQL: ${errorMessage}`,
            sql: sqlQuery,
          },
          { status: 500 }
        );
      }
    } else {
      // Réponse conversationnelle sans SQL
      console.log('💬 Réponse conversationnelle');
      return NextResponse.json({
        success: true,
        conversational: true,
        message: response,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

