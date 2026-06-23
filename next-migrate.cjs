const fs = require('fs');
const path = require('path');

function moveFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // Also, we need to fix the default exports. Next.js page files need `export default function...`
    let content = fs.readFileSync(src, 'utf8');
    // replace `export function PageName` with `export default function PageName`
    content = content.replace(/export function ([A-Za-z0-9_]+)/, 'export default function $1');
    fs.writeFileSync(dest, content, 'utf8');
    fs.unlinkSync(src);
  }
}

moveFile('src/pages/LoginPage.tsx', 'src/app/(auth)/login/page.tsx');
moveFile('src/pages/DashboardPage.tsx', 'src/app/(dashboard)/dashboard/page.tsx');
moveFile('src/pages/PatientsPage.tsx', 'src/app/(dashboard)/patients/page.tsx');
moveFile('src/pages/VisitsPage.tsx', 'src/app/(dashboard)/visits/page.tsx');
moveFile('src/pages/InvoicesPage.tsx', 'src/app/(dashboard)/invoices/page.tsx');
moveFile('src/pages/QRCodePage.tsx', 'src/app/(dashboard)/qr-code/page.tsx');
moveFile('src/pages/RegisterPage.tsx', 'src/app/register/page.tsx');
moveFile('src/pages/ConfirmationPage.tsx', 'src/app/confirmation/page.tsx');

fs.writeFileSync('src/app/layout.tsx', `import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../components/ui/Toast";

export const metadata = {
  title: "Clinic Management System",
  description: "Clinic Appointment & Reception Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
`);

fs.writeFileSync('src/app/page.tsx', `import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
`);

// The (dashboard) layout is already implemented by the pages using <DashboardLayout> in their render.
// But Next.js handles layout differently. If we keep the <DashboardLayout> in the page.tsx files, it works but isn't idiomatic.
// For now, keeping it inside the pages works perfectly fine and requires no extra refactoring.

// Update all absolute/relative imports to correctly point to components
function walkAndFixImports(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkAndFixImports(dirPath);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      let content = fs.readFileSync(dirPath, 'utf8');
      
      const relativeToSrc = path.relative(path.dirname(dirPath), 'src').replace(/\\/g, '/');
      content = content.replace(/from '(\.\.\/)+components/g, "from '@/components");
      content = content.replace(/from '(\.\.\/)+lib/g, "from '@/lib");
      content = content.replace(/from '(\.\.\/)+types/g, "from '@/types");
      content = content.replace(/from '(\.\.\/)+context/g, "from '@/context");
      
      fs.writeFileSync(dirPath, content, 'utf8');
    }
  });
}

walkAndFixImports('src/app');

