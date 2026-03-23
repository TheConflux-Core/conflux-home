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
      companyName: assessment.companyName,
      systemName: assessment.systemName,
      sspContent: assessment.sspContent || 'SSP generation pending...',
      generatedAt: assessment.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate SSP' }, { status: 500 });
  }
}
