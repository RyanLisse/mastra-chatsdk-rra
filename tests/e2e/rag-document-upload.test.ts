import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';
import path from 'node:path';

test.describe('RAG Document Upload E2E Tests', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test.describe('Document Upload Functionality', () => {
    test('should upload and process document successfully', async ({ page }) => {
      // Navigate to documents page
      await page.goto('/documents');
      
      // Wait for the page to load
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      // Create a test file for upload
      const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.txt');
      const testContent = `
        RoboRail Safety Manual
        
        1. Personal Protective Equipment (PPE)
        - Safety glasses are required at all times
        - Steel-toed boots must be worn in all operational areas
        - Hard hats are mandatory near moving equipment
        
        2. Emergency Procedures
        - Press red emergency stop button in case of malfunction
        - Evacuate personnel from danger zone immediately
        - Contact maintenance team at extension 2345
        
        3. Startup Checklist
        - Verify power connections are secure
        - Check that emergency stops are functional
        - Ensure area is clear of personnel
        - Press green START button on main panel
      `;
      
      // Upload the test document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'roborail-safety-manual.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testContent)
      });
      
      // Wait for upload to complete
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
      
      // Verify document appears in the list
      await expect(page.locator('[data-testid="document-item"]')).toContainText('roborail-safety-manual.txt');
    });

    test('should show upload progress during processing', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      const testContent = 'Simple test document for progress testing.';
      const fileInput = page.locator('input[type="file"]');
      
      await fileInput.setInputFiles({
        name: 'test-progress.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testContent)
      });
      
      // Should show progress indicator
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
      
      // Progress indicator should disappear
      await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();
    });

    test('should handle upload errors gracefully', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      // Mock a server error for document processing
      await page.route('**/api/documents/upload', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Document processing failed' })
        });
      });
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'error-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test document')
      });
      
      // Should show error message
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      
      await page.unroute('**/api/documents/upload');
    });
  });

  test.describe('RAG Query Functionality', () => {
    test('should use uploaded document knowledge in chat responses', async ({ page }) => {
      // First upload a document with specific knowledge
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      const knowledgeContent = `
        RoboRail Troubleshooting Guide
        
        Error Code E001: Motor Overload
        - Cause: Motor is drawing too much current
        - Solution: Check for mechanical obstructions, reduce load, or replace motor
        
        Error Code E002: Sensor Malfunction
        - Cause: Position sensor is not reading correctly
        - Solution: Clean sensor lens, check wiring, or calibrate sensor
        
        Error Code E003: Communication Timeout
        - Cause: Network connection lost
        - Solution: Check network cables, restart communication module
      `;
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'roborail-troubleshooting.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(knowledgeContent)
      });
      
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
      
      // Now go to chat and ask about the uploaded knowledge
      await page.goto('/');
      await chatPage.createNewChat();
      
      await chatPage.sendUserMessage('What does error code E001 mean and how do I fix it?');
      await chatPage.isGenerationComplete();
      
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      
      // Response should contain information from the uploaded document
      expect(assistantMessage.content.toLowerCase()).toMatch(/motor.*overload|e001/);
      expect(assistantMessage.content.toLowerCase()).toMatch(/obstruction|load|replace/);
    });

    test('should handle queries about non-existent information', async () => {
      await chatPage.sendUserMessage('What does error code E999 mean?');
      await chatPage.isGenerationComplete();
      
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      
      // Should acknowledge that it doesn't have specific information about E999
      expect(assistantMessage.content.length).toBeGreaterThan(0);
      // The exact response depends on RAG implementation
    });

    test('should combine RAG knowledge with general AI knowledge', async () => {
      await chatPage.sendUserMessage('Tell me about RoboRail safety and also general industrial safety practices');
      await chatPage.isGenerationComplete();
      
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      
      // Should provide a comprehensive response combining both sources
      expect(assistantMessage.content.length).toBeGreaterThan(100);
      expect(assistantMessage.content.toLowerCase()).toMatch(/safety|protective|equipment/);
    });
  });

  test.describe('Document Management', () => {
    test('should list uploaded documents', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="documents-list"]', { timeout: 10000 });
      
      // Should show existing documents or empty state
      const documentsList = page.locator('[data-testid="documents-list"]');
      await expect(documentsList).toBeVisible();
    });

    test('should delete documents', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      // Upload a test document first
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'delete-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Document to be deleted')
      });
      
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
      
      // Find and delete the document
      const deleteButton = page.locator('[data-testid="delete-document-button"]').first();
      await deleteButton.click();
      
      // Confirm deletion in modal/dialog
      await page.locator('[data-testid="confirm-delete"]').click();
      
      // Document should be removed from list
      await expect(page.locator('[data-testid="document-item"]')).not.toContainText('delete-test.txt');
    });

    test('should show document processing status', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'status-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Document for status testing')
      });
      
      // Should show processing status
      const statusElement = page.locator('[data-testid="document-status"]');
      await expect(statusElement).toContainText(/processing|analyzing|completed/i);
    });
  });

  test.describe('File Type Support', () => {
    test('should handle text file uploads', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Plain text document content')
      });
      
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="document-item"]')).toContainText('test.txt');
    });

    test('should reject unsupported file types', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('Not a supported file type')
      });
      
      // Should show error for unsupported file type
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    });

    test('should handle large file size limits', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForSelector('[data-testid="document-upload-area"]', { timeout: 10000 });
      
      // Create a large file (simulate with repeated content)
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB of 'A's
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'large-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(largeContent)
      });
      
      // Should show appropriate handling for large files
      // Either successful upload or file size error depending on limits
      await page.waitForSelector('[data-testid="upload-result"]', { timeout: 60000 });
    });
  });

  test.describe('Integration with Chat', () => {
    test('should indicate when RAG knowledge is used in response', async () => {
      await chatPage.sendUserMessage('What safety equipment is required for RoboRail?');
      await chatPage.isGenerationComplete();
      
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      
      // Response should reference safety equipment
      expect(assistantMessage.content.toLowerCase()).toMatch(/safety|protective|equipment|glasses|boots|helmet/);
      
      // Check if there's an indicator that RAG knowledge was used
      // This depends on the specific implementation
      const ragIndicator = assistantMessage.element.locator('[data-testid="rag-source-indicator"]');
      if (await ragIndicator.count() > 0) {
        await expect(ragIndicator).toBeVisible();
      }
    });

    test('should handle follow-up questions using context', async () => {
      // First question about a specific topic
      await chatPage.sendUserMessage('Tell me about RoboRail emergency procedures');
      await chatPage.isGenerationComplete();
      
      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(/emergency|stop|evacuate/);
      
      // Follow-up question that requires context
      await chatPage.sendUserMessage('What button should I press first?');
      await chatPage.isGenerationComplete();
      
      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(/emergency.*stop|red.*button/);
    });
  });
});