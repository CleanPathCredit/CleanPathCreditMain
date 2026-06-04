import React from "react";
import { Globe, Briefcase } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-4">
        <div className="col-span-2">
          <a href="/" className="mb-4 flex w-fit items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="Clean Path Credit" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-white leading-tight">Clean Path Credit</span>
              <span className="text-[9px] font-medium text-zinc-500 tracking-widest uppercase leading-tight">Powered by AI</span>
            </div>
          </a>
          <p className="max-w-xs text-sm text-zinc-500 mb-4">
            Developer-grade credit optimization powered by artificial intelligence. Faster, smarter, and more transparent.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="/partners"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Briefcase className="h-4 w-4" />
              Partner with us
            </a>
            <a
              href="/es-comprador"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              lang="es"
            >
              <Globe className="h-4 w-4" />
              Versión en español
            </a>
          </div>
          <div className="mt-5 space-y-1 text-sm text-zinc-500">
            <p className="font-medium text-zinc-400">Serving San Antonio &amp; all of Texas</p>
            <p><a href="tel:+13463995606" className="transition-colors hover:text-white">(346) 399-5606</a></p>
            <p><a href="mailto:hello@cleanpathcredit.com" className="transition-colors hover:text-white">hello@cleanpathcredit.com</a></p>
            <p className="pt-1 text-xs text-zinc-600">By appointment · Service delivered remotely statewide</p>
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-medium text-white">Services</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/how-it-works" className="transition-colors hover:text-white">How It Works</a></li>
            <li><a href="/unlock" className="transition-colors hover:text-white">Plans &amp; Pricing</a></li>
            <li><a href="/partners" className="transition-colors hover:text-white">Partner Program</a></li>
            <li><a href="/credit-repair-san-antonio" className="transition-colors hover:text-white">Credit Repair San Antonio</a></li>
            <li><a href="/credit-repair-houston" className="transition-colors hover:text-white">Credit Repair Houston</a></li>
            <li><a href="/faq" className="transition-colors hover:text-white">FAQ</a></li>
            <li><a href="/blog" className="transition-colors hover:text-white">Blog</a></li>
            <li><a href="/es-comprador" className="transition-colors hover:text-white" lang="es">Reparaci&oacute;n de Cr&eacute;dito</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-medium text-white">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/about" className="transition-colors hover:text-white">About</a></li>
            <li><a href="/credit-repair-rights-texas" className="transition-colors hover:text-white">Your Rights (TX)</a></li>
            <li><a href="/partners" className="transition-colors hover:text-white">Partner Program</a></li>
            <li><a href="/privacy" className="transition-colors hover:text-white">Privacy Policy</a></li>
            <li><a href="/terms" className="transition-colors hover:text-white">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-zinc-800 pt-8 text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} Clean Path Credit. All rights reserved.
      </div>
    </footer>
  );
}
