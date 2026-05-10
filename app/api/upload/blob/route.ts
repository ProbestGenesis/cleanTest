import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname,
      ) => {
        // auth
        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (!session) {
          throw new Error('Non autorisé');
        }

        return {
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
          callbackUrl:  request.url,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob, tokenPayload);

        try {
          
        } catch (error) {
          throw new Error("Impossible de traiter la fin de l'upload");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, 
    );
  }
}
