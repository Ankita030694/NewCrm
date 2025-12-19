"use server"

import { adminDb } from "@/firebase/firebase-admin"

// Define types locally to avoid circular dependencies or importing from client components
// These should match the types in userClient.ts
interface Bank {
    id: string
    bankName: string
    accountNumber: string
    loanType: string
    loanAmount: string
    settled: boolean
}

export interface Client {
    id: string
    name: string
    phone: string
    altPhone: string
    assignedTo: string
    email: string
    city: string
    alloc_adv: string
    status: string
    personalLoanDues: string
    creditCardDues: string
    banks: Bank[]
    monthlyIncome?: string
    monthlyFees?: string
    occupation?: string
    startDate?: string
    tenure?: string;
    remarks?: string
    salesNotes?: string
    queries?: string
    isPrimary: boolean
    isSecondary: boolean
    documentUrl?: string
    documentName?: string
    documentUploadedAt?: Date
    alloc_adv_secondary?: string
    alloc_adv_secondary_at?: any
    alloc_adv_at?: any
    convertedAt?: any
    adv_status?: string
    source_database?: string
    request_letter?: boolean
    sentAgreement?: boolean
    convertedFromLead?: boolean
    leadId?: string
    dob?: string
    panNumber?: string
    aadharNumber?: string
    documents?: {
        type: string
        bankName?: string
        accountType?: string
        createdAt?: string
        url?: string
        name?: string
        lastEdited?: string
        htmlUrl?: string
    }[]
    client_app_status?: {
        index: string
        remarks: string
        createdAt: number;
        createdBy: string;
    }[]
}

export interface FilterState {
    searchQuery: string
    statusFilter: string
    sourceFilter: string
    assignmentFilter: string
    cityFilter: string
    weekFilter: string
}

function getWeekFromStartDate(startDate: any): number {
    if (!startDate) return 0

    let dateObj: Date
    if (startDate && typeof startDate.toDate === "function") {
        dateObj = startDate.toDate()
    } else if (typeof startDate === "string") {
        dateObj = new Date(startDate)
    } else if (startDate instanceof Date) {
        dateObj = startDate
    } else {
        return 0
    }

    if (isNaN(dateObj.getTime())) return 0

    const dayOfMonth = dateObj.getDate()
    if (dayOfMonth >= 1 && dayOfMonth <= 7) return 1
    if (dayOfMonth >= 8 && dayOfMonth <= 14) return 2
    if (dayOfMonth >= 15 && dayOfMonth <= 21) return 3
    if (dayOfMonth >= 22 && dayOfMonth <= 31) return 4
    return 0
}

export interface FetchClientsResult {
    clients: Client[]
    facets: {
        cities: string[]
        sources: string[]
    }
}

export async function fetchClients(advocateName: string, filters?: FilterState): Promise<FetchClientsResult> {
    if (!advocateName) return { clients: [], facets: { cities: [], sources: [] } }
    if (!adminDb) {
        console.error("Firebase Admin DB not initialized")
        return { clients: [], facets: { cities: [], sources: [] } }
    }

    try {
        const clientsRef = adminDb.collection("clients")
        const primarySnapshot = await clientsRef.where("alloc_adv", "==", advocateName).get()
        const secondarySnapshot = await clientsRef.where("alloc_adv_secondary", "==", advocateName).get()

        let clientsList: Client[] = []
        const processedIds = new Set<string>()

        primarySnapshot.forEach((doc) => {
            const clientData = doc.data()
            const transformedClient: Client = {
                ...clientData,
                id: doc.id,
                altPhone: clientData.altPhone || "",
                banks: (clientData.banks || []).map((bank: any) => ({
                    ...bank,
                    settled: bank.settled ?? false,
                })),
                isPrimary: true,
                isSecondary: false,
                // Convert Firestore timestamps to dates or strings if needed, 
                // but for now we keep them as is or let the client handle it.
                // Note: Server actions serialize return values. Firestore Timestamps might need conversion.
                // We'll convert known timestamps to be safe.
                startDate: clientData.startDate ? (typeof clientData.startDate === 'object' ? clientData.startDate.toDate().toISOString() : clientData.startDate) : undefined,
            } as Client
            clientsList.push(transformedClient)
            processedIds.add(doc.id)
        })

        secondarySnapshot.forEach((doc) => {
            const clientData = doc.data()

            if (processedIds.has(doc.id)) {
                // If already added as primary, mark as secondary too
                const existingClient = clientsList.find(c => c.id === doc.id)
                if (existingClient) {
                    existingClient.isSecondary = true
                }
            } else {
                const transformedClient: Client = {
                    ...clientData,
                    id: doc.id,
                    altPhone: clientData.altPhone || "",
                    banks: (clientData.banks || []).map((bank: any) => ({
                        ...bank,
                        settled: bank.settled ?? false,
                    })),
                    isPrimary: false,
                    isSecondary: true,
                    startDate: clientData.startDate ? (typeof clientData.startDate === 'object' ? clientData.startDate.toDate().toISOString() : clientData.startDate) : undefined,
                } as Client
                clientsList.push(transformedClient)
            }
        })

        // Calculate facets from unfiltered list
        const cities = Array.from(new Set(clientsList.map(c => c.city).filter(Boolean))).sort()
        const sources = Array.from(new Set(clientsList.map(c => c.source_database).filter(Boolean))).sort()

        // Apply filters if provided
        if (filters) {
            clientsList = clientsList.filter((client) => {
                const matchesSearch =
                    filters.searchQuery === "" ||
                    client.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                    client.phone.includes(filters.searchQuery) ||
                    client.email.toLowerCase().includes(filters.searchQuery.toLowerCase())

                const matchesStatus =
                    filters.statusFilter === "all" ||
                    (filters.statusFilter === "Inactive" && !client.adv_status) ||
                    client.adv_status === filters.statusFilter

                const matchesSource = filters.sourceFilter === "all" || client.source_database === filters.sourceFilter

                const matchesAssignment =
                    filters.assignmentFilter === "all" ||
                    (filters.assignmentFilter === "primary" && client.isPrimary) ||
                    (filters.assignmentFilter === "secondary" && client.isSecondary) ||
                    (filters.assignmentFilter === "both" && client.isPrimary && client.isSecondary)

                const matchesCity = filters.cityFilter === "all" || client.city === filters.cityFilter

                const matchesWeek =
                    filters.weekFilter === "all" ||
                    (() => {
                        // Re-parse start date since it's now a string or undefined
                        const clientWeek = getWeekFromStartDate(client.startDate)
                        return clientWeek.toString() === filters.weekFilter
                    })()

                return matchesSearch && matchesStatus && matchesSource && matchesAssignment && matchesCity && matchesWeek
            })
        }

        // Sort by startDate descending
        clientsList.sort((a, b) => {
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
            return dateB - dateA
        })

        // Serialize any remaining complex objects if necessary
        return JSON.parse(JSON.stringify({
            clients: clientsList,
            facets: {
                cities,
                sources
            }
        }))
    } catch (error) {
        console.error("Error fetching clients:", error)
        throw new Error("Failed to fetch clients")
    }
}
