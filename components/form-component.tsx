"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import ThankYou from "@/components/thank-you"

interface FormData {
  name: string
  mobile: string
  email: string
  interests: string[]
  ageGroup: string
  occupation: string
  pinCode: string
  referredBy: string
}

interface FormErrors {
  name?: string
  mobile?: string
  email?: string
  interests?: string
  pinCode?: string
  referredBy?: string
}

export default function FormComponent() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    mobile: "",
    email: "",
    interests: [],
    ageGroup: "",
    occupation: "",
    pinCode: "",
    referredBy: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOtherInterestSelected, setIsOtherInterestSelected] = useState(false)
  const [customInterest, setCustomInterest] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const validateField = (name: string, value: string): string | undefined => {
  switch (name) {
    case "name":
      if (value.trim() === "") return "Full Name is required"
      if (!/^[A-Za-z\s]+$/.test(value))
        return "Full Name can only contain letters and spaces"
      return undefined

    case "mobile":
      if (value.trim() === "") return "Mobile number is required"
      if (!/^[6-9]\d{9}$/.test(value))
        return "Enter a valid 10-digit mobile number starting with 6-9"
      return undefined

    case "email":
      if (value !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Enter a valid email address"
      return undefined

    case "pinCode":
      if (value !== "" && !/^\d{6}$/.test(value))
        return "Enter a valid 6-digit PIN code"
      return undefined

    case "referredBy":
      if (value !== "" && !/^[6-9]\d{9}$/.test(value))
        return "Enter a valid 10-digit mobile number starting with 6-9"
      return undefined

    // interests, ageGroup, occupation are fully optional
    default:
      return undefined
  }
}


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "customInterest") {
      setCustomInterest(value)
      // No validation for custom interest here, it's handled on submit if needed
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))

    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "interests") {
      setIsOtherInterestSelected(value === "Other")
      if (value !== "Other") {
        setCustomInterest("") // Clear custom interest if a predefined option is selected
      }
    }

    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const isFormValid = () => {
  // Check required fields first
  const requiredFields = ["name", "mobile"]
  const requiredValid = requiredFields.every((field) => {
    const value = formData[field as keyof FormData]
   return (Array.isArray(value) ? value.length > 0 : value.trim() !== "") && !validateField(field, value as string)
  })

  // Check that no optional field has an active error
  const noValidationErrors = Object.values(errors).every((err) => !err)

  return requiredValid && noValidationErrors
}


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!isFormValid()) return

  setIsSubmitting(true)

  const campaignMap: Record<string, string> = {
    "Desktop & Laptops": "C100190",
    Printers: "C100182",
    Accessories: "C100184",
    Other: "C100184", // Default campaign ID for "Other"
  }

  try {
    console.log("[v0] Submitting form data:", formData)

    // ✅ Fix: handle array interests + custom interest
    let finalInterests = formData.interests.includes("Other")
      ? [...formData.interests.filter((i) => i !== "Other"), customInterest]
      : formData.interests

    // Handle no interests: issue a default coupon
    const interestsToIssue = finalInterests.length > 0 ? finalInterests : ["Default"]

    const dataToSend = { ...formData, interests: finalInterests }

    // --- 1. Submit to Google Form ---
    const googleFormResponse = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    })

    console.log("[v0] Google Form response status:", googleFormResponse.status)
    const googleFormResult = await googleFormResponse.json()
    console.log("[v0] Google Form response data:", googleFormResult)

    if (!googleFormResult.success) {
      console.error("Google Form submission failed:", googleFormResult.error)
      alert(`Submission failed: ${googleFormResult.error}`)
      return
    }

    // --- 2. Issue Coupon for Each Selected Interest (or default) ---
    const channelID = "WEB"
    const requestID = "250000012"
    const programID = "81"

    for (const interest of interestsToIssue) {
      const selectedCampaignID = (interest === "Default") ? "C100184" : campaignMap[interest] || "C100184"

      const couponApiPayload = {
        channelID,
        requestID,
        campaignID: selectedCampaignID,
        issuerMobileNo: formData.mobile,
        programID,
      }

      console.log("[v0] Coupon API payload:", couponApiPayload)

      const couponApiResponse = await fetch(
        "https://test-cms.apeirosai.com/cms/api/v1/issueCoupon",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(couponApiPayload),
        },
      )

      console.log("[v0] Coupon API response status:", couponApiResponse.status)
      const couponApiResult = await couponApiResponse.json()
      console.log("[v0] Coupon API response data:", couponApiResult)

      if (!couponApiResponse.ok || !couponApiResult.data?.couponCode) {
        console.error("Coupon API submission failed for", interest, ":", couponApiResult.responseMessage || "No coupon code received")
        // Removed alert for failure to minimize pop-ups
      }
    }

    // --- 3. Issue Coupon for Referred By Mobile Number (if provided) ---
    if (formData.referredBy && formData.referredBy.trim() !== "") {
      const referredByCouponPayload = {
        channelID,
        requestID,
        campaignID: campaignMap[formData.interests[0]] || "C100184", // use first interest's campaign or default
        issuerMobileNo: formData.referredBy,
        programID,
      }

      console.log("[v0] Coupon API payload (referred by):", referredByCouponPayload)

      const referredByCouponResponse = await fetch(
        "https://test-cms.apeirosai.com/cms/api/v1/issueCoupon",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(referredByCouponPayload),
        },
      )

      console.log("[v0] Coupon API response status (referred by):", referredByCouponResponse.status)
      const referredByCouponResult = await referredByCouponResponse.json()
      console.log("[v0] Coupon API response data (referred by):", referredByCouponResult)
    }

    // Show thank you page after successful submission
    setSubmitted(true)
  } catch (error) {
    console.error("Network error:", error)
    alert("Network error occurred. Please try again.")
  } finally {
    setIsSubmitting(false)
  }
}


  if (submitted) {
  return <ThankYou />
}

return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image src="/hplogo.png" alt="HP World Logo" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">HP World</h1>
              <p className="text-sm text-gray-500 -mt-1">- GEONET IT Mall</p>
            </div>
          </div>
          <p className="text-gray-600 mb-0">Sign up and get a Gift Voucher of upto Rs&nbsp;1000</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={cn(
                "h-12 text-base transition-colors",
                errors.name
                  ? "border-destructive focus-visible:ring-destructive"
                  : "border-border focus-visible:ring-ring",
              )}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleInputChange}
              className={cn(
                "h-12 text-base transition-colors",
                errors.mobile
                  ? "border-destructive focus-visible:ring-destructive"
                  : "border-border focus-visible:ring-ring",
              )}
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
            />
            {errors.mobile && <p className="text-destructive text-sm">{errors.mobile}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={cn(
                "h-12 text-base transition-colors",
                errors.email
                  ? "border-destructive focus-visible:ring-destructive"
                  : "border-border focus-visible:ring-ring",
              )}
              placeholder="Enter your email address"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests" className="text-sm font-medium text-foreground">
              Interests <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
           <div className="flex flex-col gap-2">
              {["Desktop & Laptops", "Printers", "Accessories", "Other"].map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(option)}
                    onChange={(e) => {
                      setFormData((prev) => {
                        const newInterests = e.target.checked
                          ? [...prev.interests, option]
                          : prev.interests.filter((i) => i !== option)
                        return { ...prev, interests: newInterests }
                      })

                      // Handle custom interest toggle for "Other"
                      if (option === "Other") setIsOtherInterestSelected(e.target.checked)
                    }}
                    className="h-4 w-4"
                  />
                  {option}
                </label>
              ))}
            </div>

            {isOtherInterestSelected && (
              <Input
                id="customInterest"
                name="customInterest"
                type="text"
                value={customInterest}
                onChange={handleInputChange}
                className={cn(
                  "h-12 text-base transition-colors text-black mt-2",
                  errors.interests
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-border focus-visible:ring-ring",
                )}
                placeholder="Enter your interest"
              />
            )}

            {errors.interests && <p className="text-destructive text-sm">{errors.interests}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageGroup" className="text-sm font-medium text-foreground">
              Age Group <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Select
              name="ageGroup"
              value={formData.ageGroup}
              onValueChange={(value) => handleSelectChange("ageGroup", value)}
            >
              <SelectTrigger className="h-12 text-base transition-colors border-border focus-visible:ring-ring">
                <SelectValue placeholder="Select your age group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-12">0-12</SelectItem>
                <SelectItem value="12-18">12-18</SelectItem>
                <SelectItem value="18-35">18-35</SelectItem>
                <SelectItem value="35-60">35-60</SelectItem>
                <SelectItem value="60+">60+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation" className="text-sm font-medium text-foreground">
              Occupation <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="occupation"
              name="occupation"
              type="text"
              value={formData.occupation}
              onChange={handleInputChange}
              className="h-12 text-base border-border focus-visible:ring-ring transition-colors"
              placeholder="Enter your occupation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pinCode" className="text-sm font-medium text-foreground">
              PIN Code <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="pinCode"
              name="pinCode"
              type="text"
              value={formData.pinCode}
              onChange={handleInputChange}
              className={cn(
                "h-12 text-base transition-colors",
                errors.pinCode
                  ? "border-destructive focus-visible:ring-destructive"
                  : "border-border focus-visible:ring-ring",
              )}
              placeholder="Enter 6-digit PIN code"
              maxLength={6}
            />
            {errors.pinCode && <p className="text-destructive text-sm">{errors.pinCode}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referredBy" className="text-sm font-medium text-foreground">
              Referred By <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="referredBy"
              name="referredBy"
              type="tel"
              value={formData.referredBy}
              onChange={handleInputChange}
              className={cn(
                "h-12 text-base transition-colors",
                errors.referredBy
                  ? "border-destructive focus-visible:ring-destructive"
                  : "border-border focus-visible:ring-ring",
              )}
              placeholder="Enter referrer's mobile number"
              maxLength={10}
            />
            {errors.referredBy && <p className="text-destructive text-sm">{errors.referredBy}</p>}
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="w-full h-12 text-base font-medium bg-[#0096D6] hover:bg-[#0096D6]/90 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                "Claim Your Voucher"
              )}
            </Button>
          </div>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">Your information is secure and will not be shared</p>
        </div>
      </div>
    </div>
  )
}
