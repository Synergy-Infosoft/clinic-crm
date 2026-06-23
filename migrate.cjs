const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const isClientRegex = /(useState|useEffect|useCallback|useContext|useRef|useRouter|useToast|useForm)/;

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check for "use client"
    if (isClientRegex.test(content) && !content.includes('"use client"') && !content.includes("'use client'")) {
      content = '"use client";\n\n' + content;
      changed = true;
    }

    // Replace react-router-dom
    if (content.includes('react-router-dom')) {
      content = content.replace(/import\s+\{([^}]*)useNavigate([^}]*)\}\s+from\s+['"]react-router-dom['"]/g, "import { useRouter } from 'next/navigation'");
      content = content.replace(/useNavigate\(\)/g, "useRouter()");
      content = content.replace(/navigate\(/g, "router.push(");
      // Clean up empty imports from react-router-dom
      content = content.replace(/import\s+\{\s*\}\s+from\s+['"]react-router-dom['"];?\n/g, "");
      changed = true;
    }

    // Replace <Link> if it exists from react-router-dom
    if (content.includes('Link') && content.includes('react-router-dom')) {
      content = content.replace(/import\s+\{([^}]*)Link([^}]*)\}\s+from\s+['"]react-router-dom['"]/g, "import Link from 'next/link'");
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
