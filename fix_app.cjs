const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const search = `  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Error downloading blob:', err);
      // Fallback
      window.open(fileUrl, '_blank');
    }
  };`;

const replace = `  const downloadFile = (fileUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };`;

content = content.replace(search, replace);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed App.tsx');
