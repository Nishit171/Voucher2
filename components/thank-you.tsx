import Image from "next/image"

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/hplogo.png" alt="HP World Logo" width={50} height={50} className="rounded-full shadow-md" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">HP World</h1>
              <p className="text-base text-gray-500 -mt-1">- GEONET IT Mall</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-indigo-700 mb-2">Thank You!</h2>
          <p className="text-lg text-gray-700 mb-4">You will receive your Gift Voucher on given whatsapp number.</p>
          {/* <p className="text-sm text-gray-600 italic">If the entered mobile number is not your WhatsApp number, please refresh the page and enter your WhatsApp number this time.</p> */}
        </div>
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">Your information is secure and will not be shared</p>
        </div>
      </div>
    </div>
  )
}