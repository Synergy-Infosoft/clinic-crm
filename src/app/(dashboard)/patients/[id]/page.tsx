"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { User, Phone, MapPin, ArrowLeft, Calendar, FileText, Megaphone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import * as dataService from '@/lib/dataService';
import type { Patient, Visit } from '@/types';

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientData, visitsData] = await Promise.all([
          dataService.getPatientById(id),
          dataService.getVisitsByPatient(id),
        ]);
        setPatient(patientData);
        setVisits(visitsData);
      } catch (error) {
        console.error("Failed to load patient data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-slate-800">Patient not found</h2>
          <Button onClick={() => router.push('/patients')} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/patients')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {patient.full_name}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
              Registered on {format(new Date(patient.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Details Card */}
          <div className="card p-6 md:col-span-1 space-y-6 h-fit">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
              {patient.full_name.charAt(0)}
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              <div className="flex items-center gap-3 pt-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Age & Gender</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {patient.age} years • {patient.gender}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                  <p className="text-sm font-semibold text-slate-900">{patient.phone}</p>
                </div>
              </div>

              {patient.father_name && (
                <div className="flex items-center gap-3 pt-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Father&apos;s Name</p>
                    <p className="text-sm font-semibold text-slate-900">{patient.father_name}</p>
                  </div>
                </div>
              )}

              {patient.referral_source && (
                <div className="flex items-center gap-3 pt-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Heard About Us</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{patient.referral_source.replace('_', ' ')}</p>
                  </div>
                </div>
              )}

              {patient.address && (
                <div className="flex items-center gap-3 pt-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Address</p>
                    <p className="text-sm font-semibold text-slate-900">{patient.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visits History */}
          <div className="md:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Visit History
                </h2>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {visits.length} Visits
                </span>
              </div>

              {visits.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No visits recorded for this patient yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visits.map((visit) => (
                    <div key={visit.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {format(new Date(visit.consultation_date || visit.token_date), 'MMMM d, yyyy')}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs font-medium text-slate-600">
                              Token #{visit.token_number}
                            </span>
                            {visit.consultation_time && (
                              <>
                                <span className="text-xs text-slate-500">?</span>
                                <span className="text-xs font-medium text-slate-600">
                                  {visit.consultation_time.slice(0, 5)}
                                </span>
                              </>
                            )}
                          </div>
                          {visit.doctor && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              Consulted with <span className="font-medium text-slate-700">{visit.doctor.name}</span>
                            </p>
                          )}
                        </div>
                        <StatusBadge status={visit.status} />
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100">
                        <span className="font-semibold text-xs text-slate-500 block mb-1 uppercase tracking-wider">Chief Complaint</span>
                        {visit.chief_complaint}
                      </div>

                      {visit.notes && (
                        <div className="mt-3 text-sm text-slate-700">
                          <span className="font-semibold text-xs text-slate-500 block mb-1 uppercase tracking-wider">Doctor Notes</span>
                          <p className="whitespace-pre-wrap">{visit.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
