import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: { not: 'in_progress' } },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });

    if (assessments.length === 0) {
      return NextResponse.json({ error: 'No completed assessments found' }, { status: 404 });
    }

    const assessment = assessments[0];
    return NextResponse.json({
      assessmentId: assessment.id,
      poamContent: assessment.poamContent || 'POA&M generation pending...',
      generatedAt: assessment.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate POA&M' }, { status: 500 });
  }
}
