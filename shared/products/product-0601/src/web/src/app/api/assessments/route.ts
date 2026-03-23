import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return NextResponse.json(assessments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, companyName, systemName } = await request.json();

    const assessment = await prisma.assessment.create({
      data: {
        userId,
        companyName,
        systemName,
        status: 'in_progress',
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
