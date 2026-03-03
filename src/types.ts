export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'technician' | 'user' | 'department-head' | 'agent';
    status: 'active' | 'inactive';
    organization_id?: string;
    department_id?: string;
    avatar?: string;
    created_at: string;
}

export interface Organization {
    id: string;
    name: string;
    domain?: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Ticket {
    id: string;
    ticket_id: number;
    title: string;
    description: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'approval-pending' | 'approved' | 'rejected';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    creator_id: string;
    assignee_id?: string;
    organization_id: string;
    department_id?: string;
    due_date?: string;
    response_due_date?: string;
    created_at: string;
    updated_at: string;
    creator?: Partial<User>;
    assignee?: Partial<User>;
    department?: Partial<Department>;
}

export interface Department {
    id: string;
    name: string;
    organization_id: string;
    head_id?: string;
    is_active: boolean;
    created_at: string;
    head?: Partial<User>;
}

export interface Category {
    id: string;
    name: string;
    organization_id?: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
}
