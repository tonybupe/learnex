import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X } from "lucide-react"

import { useUpdateUserProfile } from "../hooks/useUser"
import Button from "@/components/ui/Button"
import TextInput from "@/components/forms/TextInput"

/* ---------------------------------------
   TYPES
--------------------------------------- */

export type Sex = "male" | "female" | "other"

/* ---------------------------------------
   SCHEMA (PROFILE-ALIGNED)
--------------------------------------- */

const schema = z.object({
  full_name: z.string().min(2),

  phone_number: z
    .string()
    .regex(/^[0-9+\-\s()]+$/)
    .optional()
    .nullable()
    .or(z.literal("")),

  sex: z
    .union([z.enum(["male", "female", "other"]), z.literal(""), z.null()])
    .optional(),
})

type FormValues = z.infer<typeof schema>

/* ---------------------------------------
   PROPS
--------------------------------------- */

interface Props {
  isOpen: boolean
  onClose: () => void
  currentData: {
    full_name: string
    phone_number?: string | null
    sex?: Sex | null
  }
}

/* ---------------------------------------
   COMPONENT
--------------------------------------- */

export default function EditAccountModal({
  isOpen,
  onClose,
  currentData,
}: Props) {
  const [error, setError] = useState("")
  const updateProfile = useUpdateUserProfile()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: currentData.full_name,
      phone_number: currentData.phone_number ?? "",
      sex: (currentData.sex ?? "") as "" | Sex,
    },
  })

  /* ---------------------------------------
     RESET
  --------------------------------------- */

  useEffect(() => {
    if (isOpen) {
      reset({
        full_name: currentData.full_name,
        phone_number: currentData.phone_number ?? "",
        sex: (currentData.sex ?? "") as "" | Sex,
      })
      setError("")
    }
  }, [isOpen, currentData, reset])

  if (!isOpen) return null

  /* ---------------------------------------
     SUBMIT
  --------------------------------------- */

  const onSubmit = async (data: FormValues) => {
    try {
      setError("")

      const payload = {
        full_name: data.full_name,
        phone_number: data.phone_number || null,
        sex: data.sex || null,
      }

      await updateProfile.mutateAsync(payload)
      onClose()
    } catch (err) {
      setError("Failed to update account.")
      console.error(err)
    }
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2>Edit Account</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)}>

          <TextInput
            label="Full Name"
            {...register("full_name")}
            error={errors.full_name?.message}
          />

          <TextInput
            label="Phone Number"
            {...register("phone_number")}
            error={errors.phone_number?.message}
          />

          <div className="form-group">
            <label>Sex</label>
            <select {...register("sex")} className="form-select">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>

            <Button type="submit">
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}