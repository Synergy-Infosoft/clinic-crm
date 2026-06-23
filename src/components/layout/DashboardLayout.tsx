import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden print:h-auto print:bg-white print:block print:overflow-visible">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 print:overflow-visible print:pb-0">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
