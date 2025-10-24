import { NextResponse } from 'next/server';
import { getSchema } from '@/lib/schema-indexer';

export async function GET() {
  try {
    const schema = await getSchema();
    
    if (!schema) {
      return NextResponse.json({
        indexed: false,
        message: 'Aucun schéma indexé',
      });
    }

    return NextResponse.json({
      indexed: true,
      tablesCount: schema.tables.length,
      indexedAt: schema.indexedAt,
      message: `${schema.tables.length} tables indexées`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        indexed: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

