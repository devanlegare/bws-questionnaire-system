import { XCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  type?: "success" | "error";
  duration?: number;
  onClose?: () => void;
}

export default function Notification({
  message,
  type = "success",
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className={`p-2 rounded-lg shadow-lg sm:p-3 ${
          type === "success" ? "bg-primary" : "bg-red-600"
        }`}>
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className={`flex p-2 rounded-lg ${
                type === "success" ? "bg-primary-dark" : "bg-red-700"
              }`}>
                {type === "success" ? (
                  <CheckCircle2 className="h-6 w-6 text-white" />
                ) : (
                  <XCircle className="h-6 w-6 text-white" />
                )}
              </span>
              <p className="ml-3 font-medium text-white truncate">
                {message}
              </p>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  if (onClose) onClose();
                }}
                className={`-mr-1 flex p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white ${
                  type === "success" ? "hover:bg-primary-dark" : "hover:bg-red-700"
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
