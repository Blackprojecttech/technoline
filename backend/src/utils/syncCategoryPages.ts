import { exec } from 'child_process';
import path from 'path';

export function syncCategoryPages(): void {
  console.log('🔄 Syncing category pages...');
  
  const frontendPath = path.join(__dirname, '..', '..', '..', 'frontend');
  const command = `cd "${frontendPath}" && npm run create-category-pages`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error syncing category pages:', error);
      return;
    }
    if (stderr) {
      console.error('⚠️ Warnings:', stderr);
    }
    console.log('✅ Category pages synced successfully');
  });
} 