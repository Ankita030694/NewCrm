"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { Spinner } from "@/components/ui/spinner";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import ClientEditModal from "@/components/clients/ClientEditModal";
import toast, { Toaster } from "react-hot-toast";

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  monthlyIncome?: string;
  monthlyFees?: string;
  occupation?: string;
  startDate?: string;
  tenure?: string;
  remarks?: string;
  salesNotes?: string;
  queries?: string;
  alloc_adv_at?: any;
  convertedAt?: any;
  adv_status?: string;
  isPrimary: boolean;
  isSecondary: boolean;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: any;
}

function formatIndianCurrency(amount: string | undefined): string {
  if (!amount) return "—";
  
  // Remove any existing currency symbols or non-numeric characters except decimal point
  const numericValue = amount.replace(/[^\d.]/g, '');
  
  // Format with ₹ symbol and thousands separators (e.g., ₹1,50,000)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(Number(numericValue));
}

function formatIndianPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a 10-digit number without country code
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }
  
  // If it already has country code (usually 12 digits with 91)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`;
  }
  
  // Return the original if it doesn't match expected patterns
  return phone;
}

function formatIndianDate(date: any): string {
  if (!date) return "Not specified";
  
  if (date.toDate && typeof date.toDate === 'function') {
    const dateObj = date.toDate();
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }); // DD-MM-YYYY format
  }
  
  // If it's a string already, try to format it
  if (typeof date === 'string') {
    // Try to parse and format if it's a date string
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return date;
  }
  
  return "Not specified";
}

function ClientViewModal({ 
  client, 
  isOpen, 
  onClose,
  openDocumentViewer,
  openRequestLetterModal,
  openLegalNoticeModal
}: { 
  client: Client | null, 
  isOpen: boolean, 
  onClose: () => void,
  openDocumentViewer: (url?: string, name?: string) => void,
  openRequestLetterModal: (client: Client) => void,
  openLegalNoticeModal: (client: Client) => void
}) {
  if (!isOpen || !client) return null;

  // Animation when modal opens
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        {/* Client Header/Hero Section */}
        <div className="relative bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 p-8">
          <div className="absolute top-4 right-4">
            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-all duration-200"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-gray-300 mb-1 flex items-center">
                Client Profile
                <span className={`ml-3 px-3 py-0.5 rounded-full text-xs font-medium ${
                  client.status === "Converted" ? "bg-green-800 text-green-200" : "bg-blue-800 text-blue-200"
                }`}>
                  {client.status}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-1">{client.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {formatIndianPhoneNumber(client.phone)}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {client.email}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {client.city}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm font-medium">Assigned:</span>
                <span className="text-white">{formatIndianDate(client.alloc_adv_at)}</span>
              </div>
              {client.convertedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">Converted:</span>
                  <span className="text-white">{formatIndianDate(client.convertedAt)}</span>
                </div>
              )}
              {client.startDate && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm font-medium">Start Date:</span>
                  <span className="text-white">{formatIndianDate(client.startDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Client Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Financial Overview - Highlighted Summary */}
          <div className="mb-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="text-sm text-gray-400 font-medium px-4 py-2 bg-black/20">
              Financial Overview
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 p-1">
              <div className="p-3 flex flex-col">
                <span className="text-xs text-gray-400 mb-1">Personal Loan Dues</span>
                <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.personalLoanDues)}</span>
              </div>
              <div className="p-3 flex flex-col">
                <span className="text-xs text-gray-400 mb-1">Credit Card Dues</span>
                <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.creditCardDues)}</span>
              </div>
              <div className="p-3 flex flex-col">
                <span className="text-xs text-gray-400 mb-1">Monthly Income</span>
                <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.monthlyIncome)}</span>
              </div>
              <div className="p-3 flex flex-col">
                <span className="text-xs text-gray-400 mb-1">Monthly Fees</span>
                <span className="text-xl font-bold text-purple-300">{formatIndianCurrency(client.monthlyFees)}</span>
              </div>
            </div>
          </div>
          
          {/* Detailed Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal & Professional */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Information
              </h3>
              <div className="space-y-3">
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Name</span>
                  <span className="text-white w-2/3 font-medium">{client.name}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Phone</span>
                  <span className="text-white w-2/3">{formatIndianPhoneNumber(client.phone)}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Email</span>
                  <span className="text-white w-2/3">{client.email}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">City</span>
                  <span className="text-white w-2/3">{client.city}</span>
                </div>
                <div className="flex border-b border-gray-700 pb-2">
                  <span className="text-gray-400 w-1/3">Occupation</span>
                  <span className="text-white w-2/3">{client.occupation || "Not specified"}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-1/3">Tenure</span>
                  <span className="text-white w-2/3">{client.tenure ? `${client.tenure} months` : "Not specified"}</span>
                </div>
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                Bank Details
              </h3>
              
              {client.banks && client.banks.length > 0 ? (
                <div className="space-y-4">
                  {client.banks.map((bank, index) => (
                    <div key={bank.id} className={`rounded-lg bg-gray-900/50 p-4 ${index !== client.banks.length - 1 ? 'mb-3' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-white font-semibold">{bank.bankName}</h4>
                        <span className="text-xs px-2 py-1 bg-purple-900/40 text-purple-300 rounded">{bank.loanType}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">Account Number</p>
                          <p className="text-gray-200 font-mono">{bank.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Loan Amount</p>
                          <p className="text-gray-200 font-medium">{formatIndianCurrency(bank.loanAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                  No bank details available
                </div>
              )}
            </div>
            
            {/* Notes & Remarks */}
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notes & Queries
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {client.remarks && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Remarks
                    </h4>
                    <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                      {client.remarks}
                    </div>
                  </div>
                )}
                
                {client.salesNotes && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Sales Notes
                    </h4>
                    <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                      {client.salesNotes}
                    </div>
                  </div>
                )}
                
                {client.queries && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Queries
                    </h4>
                    <div className="bg-gray-800/50 p-3 rounded text-gray-200 text-sm max-h-32 overflow-y-auto">
                      {client.queries}
                    </div>
                  </div>
                )}
                
                {!client.remarks && !client.salesNotes && !client.queries && (
                  <div className="md:col-span-3 flex items-center justify-center h-32 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                    No notes or queries available
                  </div>
                )}
              </div>
            </div>

            {/* Document Section - Add this after Notes & Remarks */}
            {client.documentUrl && (
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 shadow-sm md:col-span-2 mt-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Client Document
                </h3>
                
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-white font-medium">{client.documentName || "Client Document"}</p>
                      {client.documentUploadedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded: {typeof client.documentUploadedAt === 'object' && client.documentUploadedAt.toDate ? 
                            client.documentUploadedAt.toDate().toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            }) : 'Unknown date'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                      <button
                        onClick={() => openDocumentViewer(client.documentUrl, client.documentName || "Document")}
                        className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Document
                      </button>
                      <button
                        onClick={() => openRequestLetterModal(client)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Request Letter
                      </button>
                      <button
                        onClick={() => openLegalNoticeModal(client)}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Legal Notice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with Actions */}
        {/* <div className="border-t border-gray-700 bg-gray-800/80 p-5">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              Client ID: <span className="font-mono">{client.id.substring(0, 8)}...</span>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center md:justify-end">
              <button
                onClick={() => openRequestLetterModal(client)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors duration-200 flex items-center font-medium min-w-[170px] justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Make Request Letter
              </button>
              <button
                onClick={() => openLegalNoticeModal(client)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors duration-200 flex items-center font-medium min-w-[170px] justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Make Legal Notice
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 font-medium min-w-[90px] justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div> */}
      </div>
      
      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Request Letter Form Component
function RequestLetterForm({ client, onClose }: { client: Client, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name1: client.name || "",
    bankAddress: "",
    bankEmail: "",
    accountType: "Loan Account", // Default value
    number: client.banks && client.banks.length > 0 ? client.banks[0].accountNumber || "" : "",
    reason: "Job Loss", // Default value
    email: client.email || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format the data for API submission
      const formBody = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formBody.append(key, value);
      });
      
      // Call the document generation API
      // This is where you would integrate with your document generation service
      // For now, we'll simulate a successful response
      toast.success("Document generation initiated. The document will download shortly.");
      
      // In a real implementation, you would call an API endpoint:
      // const response = await fetch('/api/generate-request-letter', {
      //   method: 'POST',
      //   body: formBody,
      // });
      
      // if (response.ok) {
      //   // Handle successful document generation
      //   // This might involve triggering a download or showing a link
      // } else {
      //   throw new Error('Failed to generate document');
      // }
      
      // Close the modal after successful submission
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name field - auto-filled and readonly */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            name="name1"
            value={formData.name1}
            readOnly
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
        </div>

        {/* Email - auto-filled and readonly */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Auto-filled</p>
        </div>

        {/* Bank Address - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Address</label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank address (use commas to separate multiple addresses)"
          />
        </div>

        {/* Bank Email - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Bank Email</label>
          <input
            type="text"
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank email (use commas to separate multiple emails)"
          />
        </div>

        {/* Account Type (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Account Type</label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Loan Account">Loan Account</option>
            <option value="Credit Card Account">Credit Card Account</option>
          </select>
        </div>

        {/* Reason (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Reason</label>
          <select
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Job Loss">Job Loss</option>
            <option value="Business Loss">Business Loss</option>
          </select>
        </div>

        {/* Account/Card Number */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Account/Card Number</label>
          <input
            type="text"
            name="number"
            value={formData.number}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter account or card number"
          />
          {client.banks && client.banks.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">Pre-filled from client data</p>
          )}
        </div>
      </div>

      {/* Form buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200 flex items-center text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>Generate Request Letter</>
          )}
        </button>
      </div>
    </form>
  );
}

// Legal Notice Form Component - placeholder implementation
function LegalNoticeForm({ client, onClose }: { client: Client, onClose: () => void }) {
  // Similar implementation to RequestLetterForm
  // This is a placeholder - you would customize this for the legal notice fields
  
  return (
    <div className="text-center py-8">
      <p className="text-white mb-4">Legal Notice form will be implemented here</p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
      >
        Close
      </button>
    </div>
  );
}

export default function AdvocateClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [advocateName, setAdvocateName] = useState<string>("");
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("");
  const [viewingDocumentName, setViewingDocumentName] = useState("");
  const [isRequestLetterModalOpen, setIsRequestLetterModalOpen] = useState(false);
  const [isLegalNoticeModalOpen, setIsLegalNoticeModalOpen] = useState(false);
  const [selectedClientForDoc, setSelectedClientForDoc] = useState<Client | null>(null);

  useEffect(() => {
    // Get the advocate name from localStorage
    if (typeof window !== "undefined") {
      const userName = localStorage.getItem("userName");
      setAdvocateName(userName || "");
    }
  }, []);

  useEffect(() => {
    async function fetchClients() {
      if (!advocateName) return;
      
      setLoading(true);
      try {
        const clientsRef = collection(db, "clients");
        
        // Modified query to get clients where the advocate is either primary or secondary
        const primaryQuery = query(clientsRef, where("alloc_adv", "==", advocateName));
        const secondaryQuery = query(clientsRef, where("alloc_adv_secondary", "==", advocateName));
        
        const [primarySnapshot, secondarySnapshot] = await Promise.all([
          getDocs(primaryQuery),
          getDocs(secondaryQuery)
        ]);
        
        const clientsList: Client[] = [];
        
        // Add primary clients with a flag
        primarySnapshot.forEach((doc) => {
          const clientData = doc.data();
          clientsList.push({ 
            id: doc.id, 
            ...clientData,
            isPrimary: true, 
            isSecondary: false 
          } as Client);
        });
        
        // Add secondary clients with a flag, avoiding duplicates
        secondarySnapshot.forEach((doc) => {
          const clientData = doc.data();
          const existingIndex = clientsList.findIndex(c => c.id === doc.id);
          
          if (existingIndex >= 0) {
            // If the client is already in the list as primary, mark it as both
            clientsList[existingIndex].isSecondary = true;
          } else {
            clientsList.push({ 
              id: doc.id, 
              ...clientData,
              isPrimary: false, 
              isSecondary: true 
            } as Client);
          }
        });
        
        setClients(clientsList);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [advocateName]);

  const handleViewDetails = (client: Client) => {
    setViewClient(client);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewClient(null);
  };

  const handleEditClient = (client: Client) => {
    setEditClient(client);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditClient(null);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    // Update the clients array with the updated client
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      )
    );
    
    // If the view modal is also open for this client, update that as well
    if (viewClient?.id === updatedClient.id) {
      setViewClient(updatedClient);
    }
  };

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        adv_status: newStatus
      });
      
      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId ? {...client, adv_status: newStatus} : client
        )
      );
      
      // Also update viewClient if the modal is open
      if (viewClient?.id === clientId) {
        setViewClient(prev => prev ? {...prev, adv_status: newStatus} : null);
      }
      
      // Show success toast
      toast.success(`Client status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Failed to update client status");
    }
  };

  const openDocumentViewer = (url?: string, name?: string) => {
    if (!url) return;
    setViewingDocumentUrl(url);
    setViewingDocumentName(name || "Document");
    setIsDocViewerOpen(true);
  };

  const openRequestLetterModal = (client: Client) => {
    setSelectedClientForDoc(client);
    setIsRequestLetterModalOpen(true);
  };

  const openLegalNoticeModal = (client: Client) => {
    setSelectedClientForDoc(client);
    setIsLegalNoticeModalOpen(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-96">
          <Spinner size="lg" />
        </div>
      );
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-white">My Clients</h1>
        {clients.length === 0 ? (
          <div className="text-center p-8 bg-gray-800 rounded-lg">
            <p className="text-gray-300">No clients assigned to you yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-800 shadow-md rounded-lg">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assignment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Personal Loan Dues</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Credit Card Dues</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-gray-200">{client.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-gray-200">{formatIndianPhoneNumber(client.phone)}</div>
                      <div className="text-sm text-gray-400">{client.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-200">{client.city}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {client.isPrimary && client.isSecondary ? (
                        <span className="px-2 py-1 bg-purple-800 text-purple-200 rounded-full text-xs font-medium">
                          Primary & Secondary
                        </span>
                      ) : client.isPrimary ? (
                        <span className="px-2 py-1 bg-blue-800 text-blue-200 rounded-full text-xs font-medium">
                          Primary
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <select
                        value={client.adv_status || "Active"}
                        onChange={(e) => handleStatusChange(client.id, e.target.value)}
                        className={`px-2 py-1.5 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-opacity-50 ${
                          client.adv_status === "Active" || !client.adv_status ? "bg-blue-800 text-blue-200 focus:ring-blue-500" :
                          client.adv_status === "Dropped" ? "bg-red-800 text-red-200 focus:ring-red-500" :
                          client.adv_status === "Not Responding" ? "bg-yellow-800 text-yellow-200 focus:ring-yellow-500" :
                          "bg-gray-800 text-gray-200 focus:ring-gray-500"
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Dropped">Dropped</option>
                        <option value="Not Responding">Not Responding</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-200">{formatIndianCurrency(client.personalLoanDues)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-200">{formatIndianCurrency(client.creditCardDues)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(client)}
                          className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded transition-colors duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded transition-colors duration-200"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <AdvocateSidebar />
      <div className="flex-1">
        {renderContent()}
        <ClientViewModal 
          client={viewClient} 
          isOpen={isViewModalOpen} 
          onClose={closeViewModal}
          openDocumentViewer={openDocumentViewer}
          openRequestLetterModal={openRequestLetterModal}
          openLegalNoticeModal={openLegalNoticeModal}
        />
        <ClientEditModal
          client={editClient}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onClientUpdated={handleClientUpdated}
        />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: 'rgba(47, 133, 90, 0.9)',
              },
            },
            error: {
              duration: 3000,
              style: {
                background: 'rgba(175, 45, 45, 0.9)',
              },
            },
          }}
        />
        
        {/* Add document viewer modal */}
        {isDocViewerOpen && viewingDocumentUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  {viewingDocumentName}
                </h3>
                <button 
                  onClick={() => setIsDocViewerOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 bg-white rounded overflow-hidden">
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocumentUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="Document Viewer"
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Request Letter Modal */}
        {isRequestLetterModalOpen && selectedClientForDoc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-bold text-white">
                  Generate Request Letter
                </h2>
                <button 
                  onClick={() => setIsRequestLetterModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <RequestLetterForm 
                client={selectedClientForDoc} 
                onClose={() => setIsRequestLetterModalOpen(false)} 
              />
            </div>
          </div>
        )}

        {/* Legal Notice Modal */}
        {isLegalNoticeModalOpen && selectedClientForDoc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-3xl w-full animate-fadeIn shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-bold text-white">
                  Generate Legal Notice
                </h2>
                <button 
                  onClick={() => setIsLegalNoticeModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <LegalNoticeForm 
                client={selectedClientForDoc} 
                onClose={() => setIsLegalNoticeModalOpen(false)} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
