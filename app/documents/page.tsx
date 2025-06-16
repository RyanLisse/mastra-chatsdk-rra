import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { DocumentUploadPage } from '@/components/rag/document-upload-page';

export default async function DocumentsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Document Upload
            </h1>
            <p className="text-muted-foreground mt-2">
              Upload markdown and JSON documents to add them to your knowledge
              base. Files are processed and made available for chat queries.
            </p>
          </div>

          <DocumentUploadPage />
        </div>
      </div>
    </div>
  );
}
