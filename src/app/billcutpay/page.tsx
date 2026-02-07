"use client"

import { useState, useEffect } from "react"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { toast } from "react-toastify"
import OverlordSidebar from "@/components/navigation/OverlordSidebar"
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi"

interface BillcutPayRecord {
  id: string
  month: string
  date: string
  amount: number
  createdAt: any
}

export default function BillcutPayPage() {
  const [records, setRecords] = useState<BillcutPayRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<BillcutPayRecord | null>(null)
  
  // Form states
  const [month, setMonth] = useState("")
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")

  useEffect(() => {
    const q = query(collection(db, "billcutpay"), orderBy("date", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRecords = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BillcutPayRecord[]
      setRecords(newRecords)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching records:", error)
      toast.error("Failed to load records")
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setMonth("")
    setDate("")
    setAmount("")
    setEditingRecord(null)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const [year, month, day] = dateString.split("-")
    return `${day}-${month}-${year}`
  }

  const handleOpenModal = (record: BillcutPayRecord | null = null) => {
    if (record) {
      setEditingRecord(record)
      setMonth(record.month)
      setDate(record.date)
      setAmount(record.amount.toString())
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!month || !date || !amount) {
      toast.error("Please fill all fields")
      return
    }

    const payload = {
      month,
      date,
      amount: parseFloat(amount),
      updatedAt: serverTimestamp(),
    }

    try {
      if (editingRecord) {
        await updateDoc(doc(db, "billcutpay", editingRecord.id), payload)
        toast.success("Record updated successfully")
      } else {
        await addDoc(collection(db, "billcutpay"), {
          ...payload,
          createdAt: serverTimestamp(),
        })
        toast.success("Record added successfully")
      }
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving record:", error)
      toast.error("Failed to save record")
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, "billcutpay", id))
        toast.success("Record deleted successfully")
      } catch (error) {
        console.error("Error deleting record:", error)
        toast.error("Failed to delete record")
      }
    }
  }

  return (
    <OverlordSidebar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Billcut Pay Management</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            <FiPlus /> Add Pay
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-black">Month</th>
                <th className="px-6 py-4 text-sm font-semibold text-black">Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-black">Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-black">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-black">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-black">{record.month}</td>
                    <td className="px-6 py-4 text-sm text-black">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 text-sm text-black">₹{record.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(record)}
                        className="text-indigo-600 hover:text-indigo-800 transition"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-black">
                  {editingRecord ? "Edit Pay Record" : "Add New Pay Record"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-black hover:text-gray-600 transition"
                >
                  <FiX size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-black"
                    required
                  >
                    <option value="">Select Month</option>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-black"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    {editingRecord ? "Update Record" : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OverlordSidebar>
  )
}
