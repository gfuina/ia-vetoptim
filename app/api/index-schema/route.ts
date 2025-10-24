import { NextResponse } from 'next/server';
import { indexDatabase } from '@/lib/schema-indexer';

export async function POST() {
  try {
    const schema = await indexDatabase();
    return NextResponse.json({
      success: true,
      message: `${schema.tables.length} tables indexées`,
      tablesCount: schema.tables.length,
      indexedAt: schema.indexedAt,
    });
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

