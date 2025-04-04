'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import ClientDetailsModal from './ClientDetailsModal';
import ClientEditModal from './ClientEditModal';
import SalesSidebar from '@/components/navigation/SalesSidebar';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaEye } from 'react-icons/fa';

// Define the Bank type to match Firebase structure
interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

// Define the Client type to match Firebase structure
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  city: string;
  lastModified: any; // Timestamp from Firebase
  creditCardDues: string;
  personalLoanDues: string;
  monthlyIncome: string;
  monthlyFees: string;
  assignedTo: string;
  assignedToId: string;
  alloc_adv: string;
  alloc_adv_at: any; // Timestamp from Firebase
  banks: Bank[];
  remarks: string;
  queries: string;
  salesNotes: string;
  source: string;
  tenure: string;
  occupation: string;
  aadharNumber: string;
  convertedFromLead: boolean;
  convertedAt: any; // Timestamp from Firebase
  leadId: string;
  startDate: string;
  message: string;
}

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // Set dark theme on component mount and fetch clients
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    
    // Get the logged-in user's name from localStorage
    const loggedInUserName = localStorage.getItem('userName') || '';
    setUserName(loggedInUserName);
    
    fetchClients(loggedInUserName);
  }, []);

  const fetchClients = async (salesPersonName: string) => {
    try {
      setLoading(true);
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('assignedTo', '==', salesPersonName));
      const querySnapshot = await getDocs(q);
      
      const clientsData: Client[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Client, 'id'>;
        clientsData.push({ id: doc.id, ...data });
      });
      
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const openClientDetails = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };
  
  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };
  
  const handleClientUpdated = () => {
    // Refresh the clients list after an update
    fetchClients(userName);
  };

  // Format the timestamp for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <SalesSidebar />
      
      <div className="flex-1 overflow-auto p-6 dark:bg-gray-900 dark:text-white">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Clients</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and view all your assigned clients</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-4">
              <FaUser className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xl text-gray-500 dark:text-gray-400">No clients found</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              You don't have any clients assigned to you yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div 
                key={client.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`h-2 ${
                  client.status === 'Converted' ? 'bg-green-500' :
                  client.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{client.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        client.status === 'Converted'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : client.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <FaEnvelope className="mr-2 text-gray-400" />
                      <span className="text-sm truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <FaPhone className="mr-2 text-gray-400" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <FaMapMarkerAlt className="mr-2 text-gray-400" />
                      <span className="text-sm">{client.city}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <FaCalendarAlt className="mr-2 text-gray-400" />
                      <span className="text-sm">{formatDate(client.lastModified)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Income</div>
                      <div className="font-medium text-green-600 dark:text-green-400">₹{client.monthlyIncome}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(client)}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openClientDetails(client)}
                        className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
                      >
                        <FaEye className="mr-1" />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedClient && (
          <>
            <ClientDetailsModal
              client={selectedClient}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              formatDate={formatDate}
            />
            
            <ClientEditModal
              client={selectedClient}
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onClientUpdated={handleClientUpdated}
            />
          </>
        )}
      </div>
    </div>
  );
}
