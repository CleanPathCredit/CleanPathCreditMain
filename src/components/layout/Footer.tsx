import React from "react";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-4">
        <div className="col-span-2">
          <a href="/" className="mb-4 flex w-fit items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-900">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-white">Clean Path Credit</span>
          </a>
          <p className="max-w-xs text-sm text-zinc-500">
            Developer-grade credit repair powered by artificial intelligence. Faster, smarter, and more transparent.
          </p>
        </div>
        
        <div>
          <h4 className="mb-4 font-medium text-white">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="transition-colors hover:text-white">AI Engine</a></li>
            <li><a href="#" className="transition-colors hover:text-white">Dispute Generator</a></li>
            <li><a href="#" className="transition-colors hover:text-white">Credit Monitoring</a></li>
            <li><a href="#" className="transition-colors hover:text-white">API Access</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-medium text-white">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="transition-colors hover:text-white">About Us</a></li>
            <li><a href="#" className="transition-colors hover:text-white">Careers</a></li>
            <li><a href="#" className="transition-colors hover:text-white">Privacy Policy</a></li>
            <li><a href="#" className="transition-colors hover:text-white">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-zinc-800 pt-8 text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} Clean Path Credit. All rights reserved.
      </div>
    </footer>
  );
}
