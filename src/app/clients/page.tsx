'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { User, Clock, Eye } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import toast from 'react-hot-toast'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/firebase'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  status: string
  city: string
  occupation: string
  aadharNumber: string
  assignedTo: string
  alloc_adv?: string
  alloc_adv_at?: any
  alloc_adv_secondary?: string
  convertedAt?: any
  convertedFromLead?: boolean
  creditCardDues?: string
  lastModified?: any
  leadId?: string
  monthlyFees?: string
  monthlyIncome?: string
  personalLoanDues?: string
  remarks?: string
  salesNotes?: string
  source_database?: string
  startDate?: string
  tenure?: string
  banks?: Array<{
    id: string;
    accountNumber: string;
    bankName: string;
    loanAmount: string;
    loanType: string;
  }>
  adv_status?: string
  documentUrl?: string
  documentName?: string
  documentUploadedAt?: Date
}

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface ToastMessage {
  id: number;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [fileUpload, setFileUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false)
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState("")
  const [viewingDocumentName, setViewingDocumentName] = useState("")
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [advocateFilter, setAdvocateFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  
  // Lists for filter dropdowns
  const [allAdvocates, setAllAdvocates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>(['Active', 'Dropped', 'Not Responding'])
  const [allSources] = useState<string[]>([
    'credsettlee',
    'ama',
    'settleloans',
    'billcut'
  ]);

  // Filtered clients based on search and filters
  const [filteredClients, setFilteredClients] = useState<Client[]>([])

  // Add new state for advocates list
  const [advocates, setAdvocates] = useState<User[]>([]);

  // Add these to your existing state declarations
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast function to add new toast
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, type }]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Remove a specific toast
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);
    }
    
    const fetchClients = async () => {
      try {
        const clientsQuery = query(collection(db, 'clients'), orderBy('name'))
        const querySnapshot = await getDocs(clientsQuery)
        
        const clientsData: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client))
        
        // Display all clients regardless of allocation status
        setClients(clientsData)
        setFilteredClients(clientsData)
        
        // Extract unique advocates and cities for filters
        const advocates = Array.from(new Set(clientsData.map(client => client.alloc_adv).filter(Boolean) as string[]))
        const cities = Array.from(new Set(clientsData.map(client => client.city).filter(Boolean) as string[]))
        
        setAllAdvocates(advocates)
        setAllCities(cities)
      } catch (err) {
        console.error('Error fetching clients:', err)
        setError('Failed to load clients data')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  useEffect(() => {
    console.log("Firebase storage initialized:", storage);
    console.log("Firebase db initialized:", db);
  }, []);

  // Function to format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    try {
      // Assuming timestamp is a Firestore Timestamp
      const date = timestamp.toDate()
      return format(date, 'PPP p')
    } catch (error) {
      return 'Invalid date'
    }
  }

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({...client});
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        [name]: value
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editingClient) return;
    
    setIsSaving(true);
    try {
      const clientRef = doc(db, 'clients', editingClient.id);
      
      // Remove id from the data to be updated
      const { id, ...clientData } = editingClient;
      
      // Update last modified timestamp
      const updatedData = {
        ...clientData,
        lastModified: new Date()
      };
      
      await updateDoc(clientRef, updatedData);
      
      // Update the local state
      setClients(clients.map(client => 
        client.id === editingClient.id ? editingClient : client
      ));
      
      // Show success toast
      showToast(
        "Client updated", 
        "Client information has been successfully updated.",
        "success"
      );
      
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating client:', err);
      // Show error toast
      showToast(
        "Update failed", 
        "Failed to update client information. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'qualified':
        return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'pending':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-500 border-red-500/50';
      default:
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    }
  };

  const renderSidebar = () => {
    if (userRole === 'overlord') {
      return <OverlordSidebar />;
    } else if (userRole === 'admin') {
      return <AdminSidebar />;
    } else {
      // Default to AdminSidebar if role is unknown
      return <AdminSidebar />;
    }
  };

  // Function to handle bank detail changes
  const handleBankChange = (bankId: string, field: string, value: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.map(bank => 
        bank.id === bankId ? { ...bank, [field]: value } : bank
      );
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Function to add a new bank
  const handleAddBank = () => {
    if (editingClient) {
      const newBank = {
        id: Date.now().toString(), // Generate a temporary ID
        bankName: '',
        accountNumber: '',
        loanAmount: '',
        loanType: 'Personal Loan',
      };
      
      const updatedBanks = editingClient.banks ? [...editingClient.banks, newBank] : [newBank];
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Function to remove a bank
  const handleRemoveBank = (bankId: string) => {
    if (editingClient && editingClient.banks) {
      const updatedBanks = editingClient.banks.filter(bank => bank.id !== bankId);
      
      setEditingClient({
        ...editingClient,
        banks: updatedBanks
      });
    }
  };

  // Add a function to handle status changes
  const handleAdvocateStatusChange = async (clientId: string, newStatus: string) => {
    setIsSaving(true);
    try {
      const clientRef = doc(db, 'clients', clientId);
      
      await updateDoc(clientRef, {
        adv_status: newStatus,
        lastModified: new Date()
      });
      
      // Update the local state
      setClients(clients.map(client => 
        client.id === clientId ? {...client, adv_status: newStatus} : client
      ));
      
      // Show success toast
      showToast(
        "Status updated", 
        `Client status has been updated to ${newStatus}.`,
        "success"
      );
    } catch (err) {
      console.error('Error updating client status:', err);
      // Show error toast
      showToast(
        "Update failed", 
        "Failed to update client status. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is a Word document
      if (file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFileUpload(file);
      } else {
        showToast(
          "Invalid file type", 
          "Please upload a Word document (.doc or .docx).",
          "error"
        );
        e.target.value = '';
      }
    }
  };

  const handleFileUpload = async () => {
    if (!fileUpload || !editingClient) return;
    
    console.log("Starting upload for file:", fileUpload.name);
    console.log("File type:", fileUpload.type);
    console.log("File size:", fileUpload.size);
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `clients/${editingClient.id}/documents/${fileUpload.name}`);
      console.log("Storage reference created:", storageRef);
      
      // Upload the file
      console.log("Starting uploadBytes...");
      const snapshot = await uploadBytes(storageRef, fileUpload);
      console.log("Upload completed:", snapshot);
      
      // Get the download URL
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL received:", downloadURL);
      
      // Update Firestore
      console.log("Updating Firestore document...");
      const clientRef = doc(db, 'clients', editingClient.id);
      await updateDoc(clientRef, {
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date(),
        lastModified: new Date()
      });
      console.log("Firestore document updated successfully");
      
      // Update local state
      setEditingClient({
        ...editingClient,
        documentUrl: downloadURL,
        documentName: fileUpload.name,
        documentUploadedAt: new Date()
      });
      
      // Show success toast
      showToast(
        "Document uploaded", 
        "The document has been successfully uploaded and linked to the client.",
        "success"
      );
      
      // Reset file upload state
      setFileUpload(null);
    } catch (err) {
      console.error('Error uploading document (detailed):', err);
      // Show more detailed error message
      let errorMessage = "Failed to upload document. ";
      if (err instanceof Error) {
        errorMessage += err.message;
      }
      showToast(
        "Upload failed", 
        errorMessage,
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const testUpload = async () => {
    console.log("Testing upload functionality...");
    
    // Create a simple test file
    const testBlob = new Blob(["Test content"], { type: "text/plain" });
    const testFile = new File([testBlob], "test-file.txt", { type: "text/plain" });
    
    try {
      console.log("Creating storage reference...");
      const storageRef = ref(storage, `test/test-file-${Date.now()}.txt`);
      
      console.log("Starting upload...");
      const snapshot = await uploadBytes(storageRef, testFile);
      console.log("Upload successful:", snapshot);
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL:", downloadURL);
      
      showToast("Test successful", "Upload test completed successfully", "success");
    } catch (err) {
      console.error("Test upload failed:", err);
      showToast("Test failed", `Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const openDocumentViewer = (url: string, name: string) => {
    setViewingDocumentUrl(url);
    setViewingDocumentName(name || "Document");
    setIsDocViewerOpen(true);
  };

  // Apply filters and search
  useEffect(() => {
    let results = [...clients]
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase()
      results = results.filter(client => 
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchTerm)) ||
        (client.aadharNumber && client.aadharNumber.includes(searchTerm))
      )
    }
    
    // Apply advocate filter
    if (advocateFilter !== 'all') {
      results = results.filter(client => client.alloc_adv === advocateFilter)
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(client => client.adv_status === statusFilter)
    }
    
    // Apply city filter
    if (cityFilter !== 'all') {
      results = results.filter(client => client.city === cityFilter)
    }
    
    setFilteredClients(results)
  }, [clients, searchTerm, advocateFilter, statusFilter, cityFilter])
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setAdvocateFilter('all')
    setCityFilter('all')
  }

  // Function to format source display name
  const formatSourceName = (source: string): string => {
    switch (source) {
      case 'credsettlee':
        return 'Cred Settle';
      case 'ama':
        return 'AMA';
      case 'settleloans':
        return 'Settle Loans';
      case 'billcut':
        return 'Bill Cut';
      default:
        return source;
    }
  };

  // Add this to your existing useEffect or create a new one
  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const advocatesQuery = query(
          collection(db, 'users'),
          where('role', '==', 'advocate'),
          where('status', '==', 'active')
        );
        
        const querySnapshot = await getDocs(advocatesQuery);
        const advocatesData: User[] = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));
        
        setAdvocates(advocatesData);
      } catch (err) {
        console.error('Error fetching advocates:', err);
        showToast(
          "Error",
          "Failed to load advocates list",
          "error"
        );
      }
    };

    fetchAdvocates();
  }, []);

  // Add this function to handle delete initiation
  const handleDeleteInitiate = (client: Client) => {
    setClientToDelete(client);
    setDeleteConfirmationName('');
    setIsDeleteModalOpen(true);
  };

  // Add this function to handle the actual deletion
  const handleDeleteConfirm = async () => {
    if (!clientToDelete || deleteConfirmationName !== clientToDelete.name) {
      showToast(
        "Error",
        "The name you entered doesn't match. Please try again.",
        "error"
      );
      return;
    }

    setIsDeleting(true);
    try {
      const clientRef = doc(db, 'clients', clientToDelete.id);
      await deleteDoc(clientRef);
      
      // Update local state
      setClients(clients.filter(client => client.id !== clientToDelete.id));
      setFilteredClients(filteredClients.filter(client => client.id !== clientToDelete.id));
      
      showToast(
        "Client deleted",
        "The client has been successfully deleted.",
        "success"
      );
      
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Error deleting client:', err);
      showToast(
        "Delete failed",
        "Failed to delete the client. Please try again.",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-gray-950 text-gray-100">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading clients...</p>
        </div>
      </div>
    </div>
  )
  
  if (error) return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      <div className="flex-1 flex justify-center items-center h-screen bg-gray-950">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-950">
      {renderSidebar()}
      
      <div className="flex-1 min-h-screen bg-gray-950 text-gray-100">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Header section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Allocated Clients</h1>
                <p className="text-gray-400 mt-1">View clients who have been allocated to Advocates</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <span className="text-sm font-medium">{filteredClients.length} clients</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                  </div>
                  <input
                    type="search"
                    className="w-full p-2.5 pl-10 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {allStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Advocate Filter */}
              <div>
                <Select value={advocateFilter} onValueChange={setAdvocateFilter}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectItem value="all">All Advocates</SelectItem>
                    {allAdvocates.map(advocate => (
                      <SelectItem key={advocate} value={advocate}>{advocate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* City Filter */}
              <div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border-gray-700">
                    <SelectItem value="all">All Cities</SelectItem>
                    {allCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Active filters and reset */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {(searchTerm || statusFilter !== 'all' || advocateFilter !== 'all' || cityFilter !== 'all') && (
                <>
                  <div className="text-sm text-gray-400">Active filters:</div>
                  
                  {searchTerm && (
                    <Badge className="bg-purple-900/60 text-purple-300 hover:bg-purple-900 border-purple-700/50 px-3 py-1.5 flex items-center gap-1">
                      Search: {searchTerm}
                      <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-white">
                        ✕
                      </button>
                    </Badge>
                  )}
                  
                  {statusFilter !== 'all' && (
                    <Badge className="bg-blue-900/60 text-blue-300 hover:bg-blue-900 border-blue-700/50 px-3 py-1.5 flex items-center gap-1">
                      Status: {statusFilter}
                      <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-white">
                        ✕
                      </button>
                    </Badge>
                  )}
                  
                  {advocateFilter !== 'all' && (
                    <Badge className="bg-amber-900/60 text-amber-300 hover:bg-amber-900 border-amber-700/50 px-3 py-1.5 flex items-center gap-1">
                      Advocate: {advocateFilter}
                      <button onClick={() => setAdvocateFilter('all')} className="ml-1 hover:text-white">
                        ✕
                      </button>
                    </Badge>
                  )}
                  
                  {cityFilter !== 'all' && (
                    <Badge className="bg-green-900/60 text-green-300 hover:bg-green-900 border-green-700/50 px-3 py-1.5 flex items-center gap-1">
                      City: {cityFilter}
                      <button onClick={() => setCityFilter('all')} className="ml-1 hover:text-white">
                        ✕
                      </button>
                    </Badge>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters}
                    className="ml-2 text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    Reset All
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Main content */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="font-semibold text-lg">Allocated Clients</h2>
              <div className="text-sm text-gray-400">
                {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'} found
              </div>
            </div>
            
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {clients.length === 0 ? 
                  "No clients have been allocated to Advocates yet." : 
                  "No clients match your current filters. Try adjusting your search criteria."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Current Status</TableHead>
                      <TableHead className="text-gray-400">City</TableHead>
                      <TableHead className="text-gray-400">Sales By</TableHead>
                      <TableHead className="text-gray-400">Allocated Advocate</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="font-medium text-white">{client.name ? client.name.toUpperCase() : 'N/A'}</TableCell>
                        <TableCell className="text-gray-300">{client.phone}</TableCell>
                        <TableCell className="text-gray-300 truncate max-w-[200px]">{client.email}</TableCell>
                        <TableCell>
                          <select
                            value={client.adv_status || "Active"}
                            onChange={(e) => handleAdvocateStatusChange(client.id, e.target.value)}
                            className={`px-2 py-1.5 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-opacity-50 ${
                              client.adv_status === "Active" || !client.adv_status ? "bg-blue-500/20 text-blue-500 border-blue-500/50 focus:ring-blue-500" :
                              client.adv_status === "Dropped" ? "bg-red-500/20 text-red-500 border-red-500/50 focus:ring-red-500" :
                              client.adv_status === "Not Responding" ? "bg-amber-500/20 text-amber-500 border-amber-500/50 focus:ring-amber-500" :
                              "bg-gray-500/20 text-gray-500 border-gray-500/50 focus:ring-gray-500"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Dropped">Dropped</option>
                            <option value="Not Responding">Not Responding</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-gray-300">{client.city ? client.city.toUpperCase() : 'N/A'}</TableCell>
                        <TableCell className="text-gray-300">{client.assignedTo}</TableCell>
                        <TableCell className="text-gray-300">{client.alloc_adv}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleViewDetails(client)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              onClick={() => handleEditClient(client)}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              size="sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteInitiate(client)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              size="sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Details Modal */}
      {isModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                  {selectedClient.name}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  {selectedClient.startDate ? `Client since ${selectedClient.startDate}` : 'Client details'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Add Document View Button */}
                {selectedClient.documentUrl && (
                  <Button
                    onClick={() => openDocumentViewer(selectedClient.documentUrl || "", selectedClient.documentName || "Document")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    View Document
                  </Button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Name</div>
                    <div className="text-white font-medium">{selectedClient.name ? selectedClient.name.toUpperCase() : 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Phone</div>
                    <div className="text-white">{selectedClient.phone}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Email</div>
                    <div className="text-white break-all">{selectedClient.email}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">City</div>
                    <div className="text-white">{selectedClient.city ? selectedClient.city.toUpperCase() : 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Occupation</div>
                    <div className="text-white">{selectedClient.occupation}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Aadhar Number</div>
                    <div className="text-white">{selectedClient.aadharNumber}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Assigned To</div>
                    <div className="text-white">{selectedClient.assignedTo}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Allocated Advocate</div>
                    <div className="text-white">{selectedClient.alloc_adv}</div>
                  </div>
                  {selectedClient.alloc_adv_at && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Advocate Allocated At</div>
                      <div className="text-white">{formatTimestamp(selectedClient.alloc_adv_at)}</div>
                    </div>
                  )}
                  {selectedClient.alloc_adv_secondary && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Secondary Advocate</div>
                      <div className="text-white">{selectedClient.alloc_adv_secondary}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Financial Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Financial Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Monthly Income</div>
                    <div className="text-green-400 font-medium flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyIncome || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Monthly Fees</div>
                    <div className="text-orange-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.monthlyFees || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Credit Card Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.creditCardDues || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Personal Loan Dues</div>
                    <div className="text-red-400 flex items-center">
                      <FaRupeeSign className="h-3 w-3 mr-1" />
                      {selectedClient.personalLoanDues || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Tenure</div>
                    <div className="text-white">{selectedClient.tenure || 'N/A'} months</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Start Date</div>
                    <div className="text-white">{selectedClient.startDate || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Source</div>
                    <div className="text-white">{selectedClient.source_database ? formatSourceName(selectedClient.source_database) : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bank Details Section */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                <FaRupeeSign className="h-4 w-4 mr-2" />
                Bank Details
              </h3>
              
              {!selectedClient.banks || selectedClient.banks.length === 0 ? (
                <div className="text-gray-400 p-3">No bank details available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-900">
                      <TableRow className="border-gray-800 hover:bg-gray-800/50">
                        <TableHead className="text-gray-400">Bank</TableHead>
                        <TableHead className="text-gray-400">Account Number</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClient.banks.map(bank => (
                        <TableRow key={bank.id} className="border-gray-800 hover:bg-gray-800/50">
                          <TableCell className="font-medium text-white">{bank.bankName}</TableCell>
                          <TableCell className="text-gray-300">{bank.accountNumber}</TableCell>
                          <TableCell>
                            <Badge className={`px-2 py-1 rounded-md border ${
                              bank.loanType === 'Credit Card' 
                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                : 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                            }`}>
                              {bank.loanType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-red-400 flex items-center">
                            <FaRupeeSign className="h-3 w-3 mr-1" />
                            {bank.loanAmount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
                <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
                  {selectedClient.remarks || "No remarks available."}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
                <div className="bg-gray-950 p-3 rounded border border-gray-700 min-h-[100px] text-gray-300">
                  {selectedClient.salesNotes || "No sales notes available."}
                </div>
              </div>
            </div>

            {/* Conversion Information */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-3 text-purple-400">Conversion Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Converted From Lead</div>
                  <div className="text-white">{selectedClient.convertedFromLead ? 'Yes' : 'No'}</div>
                </div>
                {selectedClient.convertedAt && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Converted At</div>
                    <div className="text-white">{formatTimestamp(selectedClient.convertedAt)}</div>
                  </div>
                )}
                {selectedClient.leadId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-400">Lead ID</div>
                    <div className="text-white">{selectedClient.leadId}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">Last Modified</div>
                  <div className="text-white">{formatTimestamp(selectedClient.lastModified)}</div>
                </div>
              </div>
            </div>

            {/* Document Section - Add this after the grid with Personal and Financial Information */}
            {selectedClient.documentUrl && (
              <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Client Document
                </h3>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        {selectedClient.documentName || "Client Document"}
                      </p>
                      {selectedClient.documentUploadedAt && (
                        <p className="text-sm text-gray-400 mt-1">
                          Uploaded on: {formatTimestamp(selectedClient.documentUploadedAt)}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => openDocumentViewer(selectedClient.documentUrl || "", selectedClient.documentName || "Document")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      View Document
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Edit Client: {editingClient.name}
                </h2>
                <p className="text-gray-400 flex items-center mt-1">
                  Update client information
                </p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-blue-400 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Name</label>
                    <Input 
                      name="name"
                      value={editingClient.name ? editingClient.name.toUpperCase() : ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Phone</label>
                    <Input 
                      name="phone"
                      value={editingClient.phone}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email</label>
                    <Input 
                      name="email"
                      value={editingClient.email}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">City</label>
                    <Input 
                      name="city"
                      value={editingClient.city}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Occupation</label>
                    <Input 
                      name="occupation"
                      value={editingClient.occupation}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Aadhar Number</label>
                    <Input 
                      name="aadharNumber"
                      value={editingClient.aadharNumber}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Assigned To</label>
                    <Input 
                      name="assignedTo"
                      value={editingClient.assignedTo}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Primary Allocated Advocate</label>
                    <Select 
                      defaultValue={editingClient.alloc_adv || "unassigned"}
                      onValueChange={(value) => handleSelectChange('alloc_adv', value)}
                    >
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                        <SelectValue placeholder="Select primary advocate" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectGroup>
                          <SelectLabel>Advocates</SelectLabel>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {advocates.map(advocate => (
                            <SelectItem 
                              key={advocate.uid} 
                              value={`${advocate.firstName} ${advocate.lastName}`.trim()}
                            >
                              {advocate.firstName} {advocate.lastName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Secondary Allocated Advocate</label>
                    <Select 
                      defaultValue={editingClient.alloc_adv_secondary || "unassigned"}
                      onValueChange={(value) => handleSelectChange('alloc_adv_secondary', value)}
                    >
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                        <SelectValue placeholder="Select secondary advocate" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectGroup>
                          <SelectLabel>Advocates</SelectLabel>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {advocates.map(advocate => (
                            <SelectItem 
                              key={advocate.uid} 
                              value={`${advocate.firstName} ${advocate.lastName}`.trim()}
                            >
                              {advocate.firstName} {advocate.lastName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* <div>
                    <label className="text-sm text-gray-400 block mb-1">Status</label>
                    <Select 
                      value={editingClient.status} 
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div> */}
                </div>
              </div>
              
              {/* Financial Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4 text-green-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Financial Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Monthly Income</label>
                    <Input 
                      name="monthlyIncome"
                      value={editingClient.monthlyIncome || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Monthly Fees</label>
                    <Input 
                      name="monthlyFees"
                      value={editingClient.monthlyFees || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Credit Card Dues</label>
                    <Input 
                      name="creditCardDues"
                      value={editingClient.creditCardDues || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Personal Loan Dues</label>
                    <Input 
                      name="personalLoanDues"
                      value={editingClient.personalLoanDues || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Tenure (months)</label>
                    <Input 
                      name="tenure"
                      value={editingClient.tenure || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Start Date</label>
                    <Input 
                      name="startDate"
                      value={editingClient.startDate || ''}
                      onChange={handleEditInputChange}
                      className="bg-gray-950 border-gray-700 text-white"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Source</label>
                    <Select 
                      value={editingClient.source_database || 'none'} 
                      onValueChange={(value) => handleSelectChange('source_database', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        <SelectItem value="none">Select source</SelectItem>
                        {allSources.map(source => (
                          <SelectItem key={source} value={source}>
                            {formatSourceName(source)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bank Details Section */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-blue-400 flex items-center">
                  <FaRupeeSign className="h-4 w-4 mr-2" />
                  Bank Details
                </h3>
                <Button
                  onClick={handleAddBank}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M12 5v14M5 12h14"></path></svg>
                  Add Bank
                </Button>
              </div>
              
              {!editingClient.banks || editingClient.banks.length === 0 ? (
                <div className="text-gray-400 p-3 text-center">
                  No bank details available. Click "Add Bank" to add a bank.
                </div>
              ) : (
                <div className="space-y-4">
                  {editingClient.banks.map((bank, index) => (
                    <div 
                      key={bank.id}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative"
                    >
                      <button
                        onClick={() => handleRemoveBank(bank.id)}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-900/50 hover:bg-red-800 text-red-300 flex items-center justify-center"
                        title="Remove bank"
                      >
                        ✕
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Bank Name</label>
                          <Input 
                            value={bank.bankName}
                            onChange={(e) => handleBankChange(bank.id, 'bankName', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Account Number</label>
                          <Input 
                            value={bank.accountNumber}
                            onChange={(e) => handleBankChange(bank.id, 'accountNumber', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Loan Type</label>
                          <Select 
                            value={bank.loanType} 
                            onValueChange={(value) => handleBankChange(bank.id, 'loanType', value)}
                          >
                            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 text-white border-gray-700">
                              <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="Home Loan">Home Loan</SelectItem>
                              <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Loan Amount</label>
                          <Input 
                            value={bank.loanAmount}
                            onChange={(e) => handleBankChange(bank.id, 'loanAmount', e.target.value)}
                            className="bg-gray-950 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Remarks</h3>
                <Textarea 
                  name="remarks"
                  value={editingClient.remarks || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
                />
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold text-lg mb-3 text-yellow-400">Sales Notes</h3>
                <Textarea 
                  name="salesNotes"
                  value={editingClient.salesNotes || ''}
                  onChange={handleEditInputChange}
                  className="bg-gray-950 border-gray-700 text-white min-h-[100px]"
                />
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4 text-purple-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Document Management
              </h3>
              
              {editingClient.documentUrl ? (
                <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{editingClient.documentName || 'Document'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded: {editingClient.documentUploadedAt ? 
                          formatTimestamp(editingClient.documentUploadedAt) : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openDocumentViewer(editingClient.documentUrl || "", editingClient.documentName || "Document")}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        View Document
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 mb-4">No document has been uploaded for this client yet.</p>
              )}
              
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-400 block mb-1">Upload Word Document</label>
                  <Input 
                    id="file-upload"
                    type="file"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={!fileUpload || uploading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {uploading ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </div>
                  ) : 'Upload Document'}
                </Button>
              </div>
              
              {/* Test Upload Button for Debugging */}
              <div className="mt-3">
                <Button
                  onClick={testUpload}
                  className="bg-gray-600 hover:bg-gray-700"
                  size="sm"
                >
                  Test Upload (Debug)
                </Button>
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="mt-8 flex justify-end gap-4">
              <Button
                onClick={() => setIsEditModalOpen(false)}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? 
                  <div className="flex items-center">
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                  : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`animate-slide-up rounded-lg border p-4 shadow-md max-w-md ${
              toast.type === 'success' 
                ? 'bg-green-900/90 border-green-600 text-green-100' 
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-600 text-red-100'
                : 'bg-gray-800/90 border-gray-700 text-gray-100'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{toast.title}</h4>
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-xs opacity-70 hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-full"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Document Viewer Modal */}
      {isDocViewerOpen && viewingDocumentUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] animate-fade-in shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {viewingDocumentName}
              </h3>
              <div className="flex gap-3">
                <Button
                  onClick={() => window.open(viewingDocumentUrl, '_blank')}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Download
                </Button>
                <button 
                  onClick={() => setIsDocViewerOpen(false)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-white rounded overflow-hidden">
              {/* Use Google Docs Viewer or Microsoft Office Online */}
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocumentUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title="Document Viewer"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full animate-fade-in shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-red-500 mb-2">Delete Client</h3>
              <p className="text-gray-400 mb-6">
                This action cannot be undone. Please type <span className="font-semibold text-white">{clientToDelete.name}</span> to confirm deletion.
              </p>
              
              <Input
                type="text"
                value={deleteConfirmationName}
                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                placeholder={clientToDelete.name}
                className="bg-gray-950 border-gray-700 text-white mb-4"
              />
              
              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => setIsDeleteModalOpen(false)}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 text-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmationName !== clientToDelete.name || isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Client'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(1rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
