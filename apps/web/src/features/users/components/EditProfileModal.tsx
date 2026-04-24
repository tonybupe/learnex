// features/users/components/EditProfileModal.tsx

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import TextInput from "@/components/forms/TextInput"
import TextArea from "@/components/forms/TextArea"

import { useUpdateUserProfile } from "../hooks/useUser"
import { useAuth } from "@/features/auth/useAuth"

import type { UserProfileDetails } from "@/types/api"

/* =======================================
   VALIDATION SCHEMA
======================================= */

const schema = z.object({
  bio: z.string().max(300).optional(),

  location: z.string().max(100).optional(),
  country: z.string().max(100).optional(),

  profession: z.string().max(120).optional(),
  organization: z.string().max(120).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),

  // future ready
  skills: z.any().optional(),
  interests: z.any().optional(),
})

type FormValues = z.infer<typeof schema>

/* =======================================
   PROPS
======================================= */

export type EditProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  currentData?: UserProfileDetails
}

/* =======================================
   COMPONENT
======================================= */

export default function EditProfileModal({
  isOpen,
  onClose,
  currentData,
}: EditProfileModalProps) {
  const { user } = useAuth()
  const updateProfile = useUpdateUserProfile()

  /* ---------------------------------------
     FORM
  --------------------------------------- */

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: "",
      location: "",
      country: "",
      profession: "",
      organization: "",
      website: "",
    },
  })

  /* ---------------------------------------
     SYNC DATA
  --------------------------------------- */

  useEffect(() => {
    if (!currentData) return

    form.reset({
      bio: currentData.bio ?? "",
      location: currentData.location ?? "",
      country: currentData.country ?? "",
      profession: currentData.profession ?? "",
      organization: currentData.organization ?? "",
      website: currentData.website ?? "",
    })
  }, [currentData, form])

  /* ---------------------------------------
     SUBMIT
  --------------------------------------- */

  const onSubmit = async (data: FormValues) => {
    try {
      await updateProfile.mutateAsync(data)
      onClose()
    } catch (err) {
      console.error("Profile update failed", err)
    }
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">

      <form onSubmit={form.handleSubmit(onSubmit)} className="form-stack">

        {/* =========================
            ABOUT
        ========================= */}
        <div className="form-section">
          <h3 className="form-section-title">About</h3>

          <TextArea
            label="Bio"
            placeholder="Tell something about yourself..."
            {...form.register("bio")}
          />
        </div>

        {/* =========================
            LOCATION
        ========================= */}
        <div className="form-section">
          <h3 className="form-section-title">Location</h3>

          <div className="form-grid-2">
            <TextInput
              label="City / Location"
              {...form.register("location")}
            />

            <TextInput
              label="Country"
              {...form.register("country")}
            />
          </div>
        </div>

        {/* =========================
            PROFESSIONAL
        ========================= */}
        <div className="form-section">
          <h3 className="form-section-title">Professional</h3>

          <TextInput
            label="Profession"
            {...form.register("profession")}
          />

          <TextInput
            label="Organization"
            {...form.register("organization")}
          />

          <TextInput
            label="Website"
            placeholder="https://yourwebsite.com"
            {...form.register("website")}
          />
        </div>

        {/* =========================
            ACTIONS
        ========================= */}
        <div className="form-actions">

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={updateProfile.isPending}
          >
            Save Changes
          </Button>

        </div>

      </form>
    </Modal>
  )
}
