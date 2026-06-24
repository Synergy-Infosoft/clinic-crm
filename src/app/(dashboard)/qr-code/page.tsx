"use client";

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClipboardList, Copy, Download, ExternalLink, Printer, Smartphone } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

// Dynamically import QRCode to avoid SSR issues (it uses canvas/window internals)
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

export default function QRCodePage() {
  const toast = useToast()
  const [registrationUrl, setRegistrationUrl] = useState('')

  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
    const baseUrl = configuredUrl && configuredUrl.startsWith('http')
      ? configuredUrl.replace(/\/$/, '')
      : window.location.origin
    setRegistrationUrl(`${baseUrl}/register`)
  }, [])

  const handleCopy = () => {
    if (!registrationUrl) return
    navigator.clipboard.writeText(registrationUrl)
    toast.success('Link copied to clipboard!')
  }

  const handleDownload = async () => {
    const svg = document.querySelector('#qr-svg svg') as SVGSVGElement | null
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const image = new Image()
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }))
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 100, 72, 440, 440)
      ctx.fillStyle = '#0f172a'
      ctx.font = '700 30px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Scan to Register', 320, 570)
      ctx.fillStyle = '#475569'
      ctx.font = '18px system-ui, sans-serif'
      ctx.fillText('ClinicFlow Medical Center', 320, 605)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'clinic-registration-qr.png'
        a.click()
        URL.revokeObjectURL(url)
        URL.revokeObjectURL(svgUrl)
        toast.success('QR code downloaded as PNG')
      }, 'image/png')
    }
    image.src = svgUrl
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <PageHeader
          title="Patient Self-Registration QR"
          description="Patients can scan this code to register themselves in the queue"
        />

        <div className="mt-6 max-w-lg mx-auto">
          {/* QR Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col items-center">
            {/* Header */}
            <div className="w-14 h-14 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mb-4">
              <Smartphone className="w-7 h-7 text-[var(--primary)]" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Scan to Register</h2>
            <p className="text-slate-500 text-sm text-center mb-8 max-w-xs">
              Display this QR code at reception. Patients can scan it to join the queue without
              waiting at the counter.
            </p>

            {/* QR Code */}
            <div
              id="qr-svg"
              className="bg-white p-5 rounded-2xl border-4 border-[var(--primary-light)] shadow-sm"
            >
              {registrationUrl ? (
                <QRCode value={registrationUrl} size={220} fgColor="#0f172a" bgColor="#ffffff" />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Clinic label under QR */}
            <div className="mt-4 px-4 py-2 bg-[var(--primary)] rounded-xl">
              <p className="text-white text-xs font-bold tracking-wide text-center">
                ClinicFlow Medical Center
              </p>
            </div>
          </div>

          {/* URL Display */}
          {registrationUrl && (
            <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Direct Registration Link
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-sm font-medium text-[var(--primary)] hover:underline break-all"
                >
                  {registrationUrl}
                </a>
                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 grid grid-cols-3 gap-3 print:hidden">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 h-11 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
              Setup Instructions
            </p>
            <ol className="space-y-2">
              {[
                'Print this QR code and place it at the reception desk or entrance.',
                'Patients scan the code with their phone camera.',
                'They fill in their details and receive a token number instantly.',
                'The token appears live on your Dashboard queue.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-700 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
