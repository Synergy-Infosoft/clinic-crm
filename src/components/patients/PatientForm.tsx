"use client";

import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import type { Patient } from '../../types'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().min(1, 'Age must be at least 1').max(120, 'Age must be less than 120'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  father_name: z.string().max(120).optional(),
  referral_source: z.string().optional(),
  address: z.string().optional(),
})

export type PatientFormData = z.infer<typeof schema>

interface PatientFormProps {
  patient?: Patient
  onSubmit: (data: PatientFormData) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
}

export function PatientForm({ patient, onSubmit, onCancel, submitLabel = 'Save Patient' }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: patient
      ? {
          full_name: patient.full_name,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          father_name: patient.father_name ?? '',
          referral_source: patient.referral_source ?? '',
          address: patient.address ?? '',
        }
      : undefined,
  })

  const handleFormSubmit: SubmitHandler<PatientFormData> = async (data) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        required
        placeholder="Enter patient's full name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Age"
          type="number"
          required
          placeholder="e.g. 35"
          error={errors.age?.message}
          {...register('age')}
        />
        <Select
          label="Gender"
          required
          error={errors.gender?.message}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
          placeholder="Select gender"
          {...register('gender')}
        />
      </div>
      <Input
        label="Father's Name"
        placeholder="Optional"
        error={errors.father_name?.message}
        {...register('father_name')}
      />
      <Input
        label="Phone Number"
        type="tel"
        required
        placeholder="10-digit mobile number"
        maxLength={10}
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Select
        label="How did they hear about us?"
        options={[
          { value: 'google', label: 'Google Search' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'social_media', label: 'Social Media' },
          { value: 'friend_family', label: 'Friend or Family' },
          { value: 'doctor_referral', label: 'Doctor Referral' },
          { value: 'walk_in', label: 'Walk-in / Signboard' },
          { value: 'other', label: 'Other' },
        ]}
        placeholder="Select an option"
        error={errors.referral_source?.message}
        {...register('referral_source')}
      />
      <Textarea
        label="Address"
        placeholder="Enter patient's address (optional)"
        rows={2}
        {...register('address')}
      />
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
