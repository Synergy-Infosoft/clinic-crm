"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Receipt, User, Calendar, CreditCard, Banknote, CheckCircle, Printer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import * as dataService from "@/lib/dataService";
import type { Invoice, ChargePreset } from "@/types";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [chargePresets, setChargePresets] = useState<ChargePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [invoiceData, presetsData] = await Promise.all([
        dataService.getInvoiceById(id),
        dataService.getChargePresets(),
      ]);
      setInvoice(invoiceData);
      setChargePresets(presetsData);
    } catch (error) {
      console.error("Failed to load invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  const handleLocalUpdate = (updates: Partial<Invoice>) => {
    if (!invoice) return;
    setInvoice(function (prev) {
      return prev ? { ...prev, ...updates } : prev;
    });
  };

  const saveInvoice = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      await dataService.updateInvoice(invoice.id, {
        line_items: invoice.line_items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
      });
      toast.success("Invoice saved");
    } catch {
      toast.error("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (method: "cash" | "online_upi") => {
    if (!invoice) return;
    setSaving(true);
    try {
      await dataService.updateInvoice(invoice.id, {
        payment_status: method === "cash" ? "paid_cash" : "paid_online",
        payment_method: method,
      });
      const full = await dataService.getInvoiceById(invoice.id);
      setInvoice(full);
      toast.success("Payment recorded - " + (method === "cash" ? "Cash" : "UPI/Online"));
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Invoice not found</h2>
          <p className="text-sm text-slate-500 mt-1">This invoice may have been deleted or the ID is incorrect.</p>
          <Button onClick={() => router.push("/invoices")} className="mt-4">
            Back to Invoices
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isPaid = invoice.payment_status !== "pending";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 print:p-0 print:m-0 print:w-full print:max-w-none">
        
        {/* Print-only Header */}
        <div className="hidden print:block text-center mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold text-slate-900">ClinicFlow Medical Center</h1>
          <p className="text-sm text-slate-500 mt-1">Dr. Clinic</p>
          <p className="text-sm text-slate-500">123 Health Ave, Medical District</p>
          <p className="text-sm text-slate-500">Phone: +1 234 567 8900</p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 print:mb-6">
          <button
            onClick={() => router.push("/invoices")}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors self-start print:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-slate-400" />
              {"Invoice #" + invoice.invoice_number}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {"Created on " + formatDate(invoice.created_at, "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={"inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border " + getStatusColor(invoice.payment_status)}>
              {isPaid && <CheckCircle className="w-3.5 h-3.5" />}
              {getStatusLabel(invoice.payment_status)}
            </span>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors print:hidden"
              title="Print Invoice"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:flex print:flex-col print:gap-4">
          {/* Left: Patient and Visit Info */}
          <div className="space-y-4 print:flex print:flex-row print:gap-4 print:space-y-0">
            <div className="card p-5 space-y-4 print:flex-1 print:shadow-none print:border print:border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Details</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {invoice.patient?.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{invoice.patient?.full_name || "Unknown"}</p>
                  <p className="text-xs text-slate-500">
                    {invoice.patient?.age + "y - " + invoice.patient?.gender}
                    {invoice.patient?.phone && (" - " + invoice.patient.phone)}
                  </p>
                </div>
              </div>
            </div>

            {invoice.visit && (
              <div className="card p-5 space-y-3 print:flex-1 print:shadow-none print:border print:border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visit Info</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{formatDate(invoice.visit.token_date, "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{"Token #" + invoice.visit.token_number}</span>
                  </div>
                </div>
                {invoice.visit.chief_complaint && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Chief Complaint</p>
                    <p className="text-sm text-slate-700">{invoice.visit.chief_complaint}</p>
                  </div>
                )}
              </div>
            )}

            {isPaid && (
              <div className="card p-5 bg-emerald-50 border-emerald-100 space-y-2 print:flex-1 print:shadow-none print:bg-white print:border-slate-200">
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 print:text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Payment Received
                </h3>
                <p className="text-sm text-emerald-800 font-medium">
                  {invoice.payment_method === "cash" ? "Paid by Cash" : "Paid via UPI/Online"}
                </p>
                {invoice.paid_at && (
                  <p className="text-xs text-emerald-600">
                    {format(new Date(invoice.paid_at), "MMM d, yyyy - hh:mm a")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Invoice Form and Actions */}
          <div className="lg:col-span-2 space-y-4 print:mt-6">
            <div className="card p-5 print:shadow-none print:border print:border-slate-200 print:p-0">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 print:hidden">Charges</h3>
              {isPaid ? (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-2.5">Description</th>
                          <th className="text-center text-xs font-semibold text-slate-600 px-3 py-2.5 w-16">Qty</th>
                          <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2.5 w-28">Rate</th>
                          <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2.5 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.line_items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-sm text-slate-400">
                              No charges on this invoice.
                            </td>
                          </tr>
                        ) : (
                          invoice.line_items.map(function (item) {
                            return (
                              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                                <td className="px-3 py-3 text-center text-sm text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCurrency(item.amount)}</td>
                                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                                  {formatCurrency(item.amount * item.quantity)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Discount</span>
                        <span className="font-medium text-red-600">{"-" + formatCurrency(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between">
                      <span className="text-base font-bold text-slate-900">Total</span>
                      <span className="text-base font-bold text-[var(--primary)]">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="print:hidden">
                  <InvoiceForm
                    invoice={invoice}
                    chargePresets={chargePresets}
                    onUpdate={handleLocalUpdate}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button onClick={saveInvoice} loading={saving} size="sm">
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!isPaid && (
              <div className="card p-5 print:hidden">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Record Payment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={function () { handlePayment("cash"); }}
                    disabled={saving || invoice.total <= 0}
                    className="flex items-center justify-center gap-2 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <Banknote className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-emerald-800">Pay by Cash</p>
                      <p className="text-xs text-emerald-600">{formatCurrency(invoice.total)}</p>
                    </div>
                  </button>
                  <button
                    onClick={function () { handlePayment("online_upi"); }}
                    disabled={saving || invoice.total <= 0}
                    className="flex items-center justify-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <CreditCard className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-blue-800">Pay via UPI/Online</p>
                      <p className="text-xs text-blue-600">{formatCurrency(invoice.total)}</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
