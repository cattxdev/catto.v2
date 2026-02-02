import { container } from '@sapphire/framework';
import type { CaseNote } from '@prisma/client';

export class CaseNoteService {
  async addNote(params: {
    caseId: string;
    guildId: string;
    authorId: string;
    authorTag: string;
    content: string;
  }): Promise<CaseNote> {
    return container.prisma.caseNote.create({
      data: {
        caseId: params.caseId,
        guildId: params.guildId,
        authorId: params.authorId,
        authorTag: params.authorTag,
        content: params.content,
      },
    });
  }

  async getNotes(
    caseId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ notes: CaseNote[]; total: number }> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      container.prisma.caseNote.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      container.prisma.caseNote.count({ where: { caseId } }),
    ]);

    return { notes, total };
  }

  async deleteNote(noteId: string, _requesterId: string): Promise<void> {
    const note = await container.prisma.caseNote.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new Error('Note not found');

    await container.prisma.caseNote.delete({
      where: { id: noteId },
    });
  }
}

export const caseNoteService = new CaseNoteService();
