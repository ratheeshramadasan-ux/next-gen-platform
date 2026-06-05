"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Search, Plus, MoreVertical, CheckCircle2, Clock, Ban, Zap, Check, Key, Shield, Tag, Bot, Settings, Terminal, Layout,
  Building, Mail, MapPin, Globe, ChevronRight, ChevronLeft, UserCircle, Briefcase, ShieldCheck, Lock, BookOpen,
  Edit, Activity, History, User, Save, X, AlertTriangle, ShieldAlert, Trash2, Palette, Sparkles, Box, Compass, Monitor, Fingerprint, Download, RefreshCw,
  Server, Upload, FileText, CloudUpload, HardDrive, CreditCard, ExternalLink
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAppContext } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { 
  getCustomers, 
  onboardTenantAction, 
  getCustomerFullDetail, 
  updateCustomerAction, 
  updateTenantStatusAction,
  offboardCustomerAction,
  executeFinalDecommissionAction,
  cancelHardOffboardingAction,
  getAuditLogsForTarget,
  createAuditLog,
  approveCustomerActivationAction,
  uploadCustomerLogAction,
  getCustomerLogFiles,
  getCustomerAdminsAction,
  addCustomerAdminAction,
  updateCustomerAdminAction,
  deleteCustomerAdminAction,
  toggleAdminStatusAction,
  getGlobalAuditLogs
} from "@/app/actions/tenantActions";
import { exportCustomerAuditPackage } from "@/app/actions/auditActions";
import { getPlatformLookups } from "@/app/actions/lookupActions";

export default function CustomersPage() {
  const { 
    role, 
    currentUser, 
    availableAdmins, 
    sendSimulatedEmail, 
    customers, 
    isLoadingCustomers,
    refreshCustomers,
    activeTheme,
    activeBackground
  } = useAppContext();
  
  const [lookupIndustries, setLookupIndustries] = useState<any[]>([]);
  const [lookupRegions, setLookupRegions] = useState<any[]>([]);
  const [lookupClassifications, setLookupClassifications] = useState<any[]>([]);
  const [lookupCurrencies, setLookupCurrencies] = useState<any[]>([]);
  const [lookupTimezones, setLookupTimezones] = useState<any[]>([]);
  const [lookupCustomerTypes, setLookupCustomerTypes] = useState<any[]>([]);
  const [lookupEngagementTiers, setLookupEngagementTiers] = useState<any[]>([]);
  const [industrySearch, setIndustrySearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fullDetail, setFullDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFiles, setLogFiles] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [companyData, setCompanyData] = useState({ 
    name: "", 
    displayName: "",
    industry: "", 
    location: "", 
    classification: "Customer", 
    priority: "Standard", 
    engagementTier: "Bronze",
    description: "", 
    customerType: "Enterprise", 
    customerTier: "Enterprise",

    // Identity & Localization
    currency: "USD",
    timezone: "UTC",

    // Security & Access
    authType: "Email + Password",
    allowedDomains: "",
    mfaEnforced: false,

    // Governance
    complianceMode: "Standard",
    retentionPolicyDays: 90,

    // Billing
    planType: "Monthly",
    contractStartDate: new Date().toISOString().split('T')[0],
    billingEntity: "",
    billingEmail: "",

    // Capabilities
    aiEnabled: true,
    studioAccess: true,
    apiAccess: true,
    marketplaceAccess: true,

    // Operations
    tags: "",
    accountOwner: "",
    onboardingSource: "Portal",

    // Initial Workspace
    workspaceName: "",
    workspaceSlug: "",
    workspaceLanguage: "TypeScript",
    workspaceRegion: "",
    isMultiWorkspaceEnabled: false,
    bootstrapTemplate: "None",
    projectName: "Initial Automation",
    logoUrl: "",
    slug: "",
    tenantAliases: {
      PROD: "Production",
      UAT: "User Acceptance Testing",
      STAGING: "Staging",
      DEV: "Development"
    }
  });

  // Identity State
  const [admins, setAdmins] = useState<any[]>([]);
  const [isAdminAdding, setIsAdminAdding] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    firstName: "", lastName: "", email: "", jobTitle: "", department: "", 
    role: "Admin", employmentType: "Full-time", workLocation: "Office", mfaEnabled: false, status: "Active"
  });
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  
  // Initial dual-custody admins
  const [onboardingAdmins, setOnboardingAdmins] = useState<any[]>([
    { firstName: "", lastName: "", email: "", role: "Admin", employmentType: "Full-time", workLocation: "Remote", mfaEnabled: true },
    { firstName: "", lastName: "", email: "", role: "Admin", employmentType: "Full-time", workLocation: "Remote", mfaEnabled: true }
  ]);

  // Load Lookups
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [lookups, logs] = await Promise.all([
          getPlatformLookups(true),
          getGlobalAuditLogs(currentUser.customerId, "Customer")
        ]);
        
        if (lookups.success) {
          setLookupIndustries(lookups.industries);
          setLookupRegions(lookups.regions);
          setLookupClassifications(lookups.classifications);
          setLookupCurrencies(lookups.currencies);
          setLookupTimezones(lookups.timezones);
          setLookupCustomerTypes(lookups.customerTypes);
          setLookupEngagementTiers(lookups.engagementTiers);
        }
        setGlobalLogs(logs);
      } catch (err: any) {
        console.error("[CUSTOMERS] Critical Hydration Failure:", err);
        toast.error("Telemetry Synchronization Failed: " + (err.message || "Unknown error"));
      }
    }
    fetchLookups();
  }, []);

  // Auto-select first customer when data arrives
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId && !isCreating) {
      selectCustomer(customers[0].id);
    }
  }, [customers, selectedCustomerId, isCreating]);

  if (role !== "Platform Admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Lock className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mt-2">Only Platform Administrators have the privileges required to manage organizations.</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c => 
    (c.companyName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    (c.industry?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );
  
  console.log("[CustomersPage] Render State:", { 
    totalCustomers: customers.length, 
    filteredCount: filteredCustomers.length,
    isLoading: isLoadingCustomers,
    search: searchQuery 
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleCreateNew = () => {
    console.log("[CustomersPage] Initializing Onboarding Wizard...");
    setIsCreating(true);
    setSelectedCustomerId(null);
    setStep(1);
    setCompanyData({ 
      name: "", 
      displayName: "",
      industry: "", 
      location: "", 
      classification: "Customer", 
      priority: "Standard",
      engagementTier: "Bronze",
      description: "",
      customerType: "Enterprise",
      customerTier: "Enterprise",
      
      // Extended Identity
      currency: "USD",
      timezone: "UTC",
      
      // Access & Security
      authType: "Email + Password",
      allowedDomains: "",
      mfaEnforced: false,
      
      // Governance
      complianceMode: "Standard",
      retentionPolicyDays: 30,
      
      // Billing
      planType: "Free",
      contractStartDate: new Date().toISOString().split('T')[0],
      billingEntity: "",
      billingEmail: "",
      
      // Capabilities
      aiEnabled: true,
      studioAccess: true,
      apiAccess: true,
      marketplaceAccess: true,
      
      // Ops
      tags: "",
      accountOwner: "",
      onboardingSource: "Direct",
      
      // Bootstrap
      workspaceName: "Default Workspace",
      workspaceSlug: "",
      workspaceLanguage: "en",
      workspaceRegion: "",
      isMultiWorkspaceEnabled: false,
      bootstrapTemplate: "None",
      projectName: "Initial Automation",
      logoUrl: "",
      slug: "",
      tenantAliases: {
        PROD: "Production",
        UAT: "User Acceptance Testing",
        STAGING: "Staging",
        DEV: "Development"
      }
    });
    setOnboardingAdmins([
      {
        firstName: "", lastName: "", dob: "", gender: "", location: "", email: "", employeeId: "",
        jobTitle: "", department: "", manager: "", employmentType: "Full-time", workLocation: "Office",
        startDate: "", endDate: "", mfaEnabled: false
      },
      {
        firstName: "", lastName: "", dob: "", gender: "", location: "", email: "", employeeId: "",
        jobTitle: "", department: "", manager: "", employmentType: "Full-time", workLocation: "Office",
        startDate: "", endDate: "", mfaEnabled: false
      }
    ]);

    setFormError("");
    setIsSubmitting(false);
  };

  const handleNameChange = (val: string) => {
    setCompanyData(prev => ({
      ...prev,
      name: val,
      displayName: prev.displayName === prev.name || prev.displayName === "" ? val : prev.displayName,
      slug: val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }));
  };

  const addOnboardingAdmin = () => {
    setOnboardingAdmins([...onboardingAdmins, {
      firstName: "", lastName: "", dob: "", gender: "", location: "", email: "", employeeId: "",
      jobTitle: "", department: "", manager: "", employmentType: "Full-time", workLocation: "Office",
      startDate: "", endDate: "", mfaEnabled: false
    }]);
  };

  const removeOnboardingAdmin = (index: number) => {
    if (onboardingAdmins.length <= 1) return;
    const nextList = [...onboardingAdmins];
    nextList.splice(index, 1);
    setOnboardingAdmins(nextList);
  };

  const updateOnboardingAdmin = (index: number, field: string, value: any) => {
    const nextList = [...onboardingAdmins];
    nextList[index] = { ...nextList[index], [field]: value };
    setOnboardingAdmins(nextList);
  };

  const selectCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    setIsCreating(false);
    setIsEditing(false);
    setLoadingDetail(true);
    setFormError("");
    setFullDetail(null); // Clear existing detail to force UI refresh and show loading state
    
    // Fetch Full Detail & Logs
    const [detail, files] = await Promise.all([
      getCustomerFullDetail(id),
      getCustomerLogFiles(id)
    ]);
    
    if (detail) {
      setFullDetail(detail);
      setLogFiles(files);
      
      // Identity Registry Hydration
      const adminData = await getCustomerAdminsAction(id);
      setAdmins(adminData);
    
      const logs = await getAuditLogsForTarget(detail.companyName);
      setAuditLogs(logs);
    }
    setLoadingDetail(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !currentUser) return;

    setIsSubmitting(true);
    const actor = currentUser.fullName || currentUser.name || currentUser.email;
    
    let res;
    if (isAdminEditing && editingAdminId) {
      res = await updateCustomerAdminAction(editingAdminId, newAdmin, actor);
    } else {
      res = await addCustomerAdminAction(selectedCustomerId, newAdmin, actor);
    }

    if (res.success) {
      setIsAdminAdding(false);
      setIsAdminEditing(false);
      setEditingAdminId(null);
      setNewAdmin({
        firstName: "", lastName: "", email: "", jobTitle: "", department: "", 
        role: "Admin", employmentType: "Full-time", workLocation: "Office", mfaEnabled: false, status: "Active"
      });
      // Refresh Registry
      const updatedAdmins = await getCustomerAdminsAction(selectedCustomerId);
      setAdmins(updatedAdmins);
      toast.success(isAdminEditing ? "Administrator updated." : "Administrator invited.");
    } else {
      setFormError(res.error || "Operation failed.");
      toast.error(res.error || "Operation failed.");
    }
    setIsSubmitting(false);
  };

  const handleEditAdmin = (admin: any) => {
    setEditingAdminId(admin.id);
    setNewAdmin({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      jobTitle: admin.jobTitle || "",
      department: admin.department || "",
      role: admin.role,
      employmentType: admin.employmentType,
      workLocation: admin.workLocation,
      mfaEnabled: admin.mfaEnabled,
      status: admin.status || "Active"
    });
    setIsAdminEditing(true);
    setIsAdminAdding(true);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this administrator? This action is permanent.")) return;
    if (!selectedCustomerId || !currentUser) return;

    setIsSubmitting(true);
    const res = await deleteCustomerAdminAction(adminId, currentUser.email);
    if (res.success) {
      const updatedAdmins = await getCustomerAdminsAction(selectedCustomerId);
      setAdmins(updatedAdmins);
      toast.success("Administrator removed.");
    } else {
      toast.error(res.error || "Failed to remove administrator.");
    }
    setIsSubmitting(false);
  };

  const handleToggleAdminStatus = async (admin: any) => {
    if (!selectedCustomerId || !currentUser) return;

    setIsSubmitting(true);
    const res = await toggleAdminStatusAction(admin.id, admin.status, currentUser.email);
    if (res.success) {
      const updatedAdmins = await getCustomerAdminsAction(selectedCustomerId);
      setAdmins(updatedAdmins);
      toast.success(`Administrator ${admin.status === "Active" ? "disabled" : "enabled"}.`);
    } else {
      toast.error(res.error || "Failed to update status.");
    }
    setIsSubmitting(false);
  };

  const handleLogUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCustomerId || !currentUser) return;

    setIsUploading(true);
    const res = await uploadCustomerLogAction(
      selectedCustomerId,
      file.name,
      file.type,
      file.size,
      currentUser.email
    );

    if (res.success) {
      // Refresh both logs and chronicle
      const [newFiles, newLogs] = await Promise.all([
        getCustomerLogFiles(selectedCustomerId),
        getAuditLogsForTarget(fullDetail.companyName)
      ]);
      setLogFiles(newFiles);
      setAuditLogs(newLogs);
    } else {
      alert(res.error);
    }
    setIsUploading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
    const mode = currentStatus === "Suspended" ? "RESTORE" : "SOFT";
    
    setIsSubmitting(true);
    let res;
    if (newStatus === "Suspended") {
      res = await offboardCustomerAction(id, "SOFT", role);
    } else {
      res = await updateTenantStatusAction(id, "Active", role);
    }

    if (res.success) {
      const [updatedLogs] = await Promise.all([
        getGlobalAuditLogs(currentUser.customerId, "Customer"),
        refreshCustomers()
      ]);
      setGlobalLogs(updatedLogs);
      selectCustomer(id);
    }
    setIsSubmitting(false);
  };

  const handleHardOffboard = async (id: string) => {
    if (!confirm("Initiate Hard Offboarding? The tenant will be frozen while compliance artifacts are secured.")) return;
    
    setIsSubmitting(true);
    const res = await offboardCustomerAction(id, "HARD", role);
    if (res.success) {
      const [updatedLogs] = await Promise.all([
        getGlobalAuditLogs(currentUser.customerId, "Customer"),
        refreshCustomers()
      ]);
      setGlobalLogs(updatedLogs);
      selectCustomer(id);
    } else {
      setFormError(res.error || "Offboarding initiation failed");
    }
    setIsSubmitting(false);
  };

  const handleFinalDecommission = async (id: string) => {
    if (!confirm("CRITICAL: Have you downloaded and verified the Audit Compliance Bundle? This final step will PERMANENTLY delete all customer data. Proceed?")) return;
    
    setIsSubmitting(true);
    const res = await executeFinalDecommissionAction(id, role);
    if (res.success) {
      await refreshCustomers();
      setSelectedCustomerId(null);
    } else {
      setFormError(res.error || "Final decommission failed");
    }
    setIsSubmitting(false);
  };

  const handleCancelOffboarding = async (id: string) => {
    setIsSubmitting(true);
    const res = await cancelHardOffboardingAction(id, role);
    if (res.success) {
      const [updatedLogs] = await Promise.all([
        getGlobalAuditLogs(currentUser.customerId, "Customer"),
        refreshCustomers()
      ]);
      setGlobalLogs(updatedLogs);
      selectCustomer(id);
    }
    setIsSubmitting(false);
  };

  const handleApproveActivation = async (id: string) => {
    if (!confirm(`Are you sure you want to activate ${fullDetail.companyName}?`)) return;
    
    setIsSubmitting(true);
    const res = await approveCustomerActivationAction(id, currentUser.email, role);
    if (res.success) {
      const [updatedLogs] = await Promise.all([
        getGlobalAuditLogs(currentUser.customerId, "Customer"),
        refreshCustomers()
      ]);
      setGlobalLogs(updatedLogs);
      selectCustomer(id);
    } else {
      alert(res.error || "Activation failed");
    }
    setIsSubmitting(false);
  };

  const handleExportAudit = async (id: string) => {
    setIsSubmitting(true);
    const res = await exportCustomerAuditPackage(id);
    if (res.success) {
      // In a real browser context, we'd trigger a download.
      // For this demo, we'll simulate the download ready state.
      console.log("[UI] Audit Package Data ready:", res.data);
      
      // Use a consistent mock hash for the UI demo since Web Crypto is async
      const mockHash = "SHA256-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      alert("Compliance Audit Bundle generated successfully.\nVerification Manifest: " + mockHash);
    }
    setIsSubmitting(false);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    
    const payload = {
      customerId: selectedCustomerId,
      companyName: fullDetail.companyName,
      industry: fullDetail.industry,
      location: fullDetail.location,
      classification: fullDetail.classification,
      priority: fullDetail.priority,
      description: fullDetail.description,
      updatedBy: "Ratheesh (Platform Admin)",
      tenantAdmins: fullDetail.tenantAdmins,
      customerType: fullDetail.customerType,
      customerTier: fullDetail.customerTier,
      logoUrl: fullDetail.logoUrl
    };

    const result = await updateCustomerAction(payload);
    if (result.success) {
      await refreshCustomers();
      setIsEditing(false);
      selectCustomer(selectedCustomerId!);
    } else {
      setFormError(result.error || "Update failed");
    }
    setIsSubmitting(false);
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setFormError("");
    if (step === 1) {
      if (!companyData.name || !companyData.industry || !companyData.location || !companyData.customerType || !companyData.customerTier) {
        setFormError("Please fill out Company Name, Industry, Region, Type and Tier.");
        return;
      }
    } else if (step === 2) {
      if (onboardingAdmins.length < 2) {
        setFormError("Platform Security Policy: A minimum of two (2) Administrative Identities are required for organizational onboarding.");
        return;
      }
      const invalid = onboardingAdmins.some(a => !a.firstName || !a.lastName || !a.email);
      if (invalid) {
        setFormError("Please fill out First Name, Last Name, and Email for both administrators.");
        return;
      }

      // Domain Validation at Step 2 Transition
      if (companyData.allowedDomains) {
        const allowedDomainsList = companyData.allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
        if (allowedDomainsList.length > 0) {
          const adminsWithInvalidDomains = onboardingAdmins.filter(a => {
            const emailParts = a.email.split('@');
            if (emailParts.length < 2) return true;
            const domain = emailParts[1].toLowerCase();
            return !allowedDomainsList.includes(domain);
          });

          if (adminsWithInvalidDomains.length > 0) {
            setFormError(`Domain Policy Violation: Admin emails [${adminsWithInvalidDomains.map(a => a.email).join(', ')}] do not match allowed domains [${allowedDomainsList.join(', ')}].`);
            return;
          }
        }
      } else {
        setFormError("Security Baseline Violation: At least one Allowed Identity Domain is required. Please go back to Step 1 and define your authorized domains.");
        return;
      }
    }

    setStep(step + 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");

    // Global Validation
    if (!companyData.name || !companyData.industry || !companyData.location || !companyData.customerType || !companyData.customerTier) {
      const msg = "Please fill out Company Name, Industry, Region, Type and Tier.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (onboardingAdmins.length < 1) {
      const msg = "At least one (1) administrative identity is required.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const invalidAdmins = onboardingAdmins.some(a => !a.firstName || !a.lastName || !a.email);
    if (invalidAdmins) {
      const msg = "All administrators must have a valid First Name, Last Name, and Email.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Domain Validation
    if (companyData.allowedDomains) {
      const allowedDomainsList = companyData.allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
      if (allowedDomainsList.length > 0) {
        const adminsWithInvalidDomains = onboardingAdmins.filter(a => {
          const emailParts = a.email.split('@');
          if (emailParts.length < 2) return true;
          const domain = emailParts[1].toLowerCase();
          return !allowedDomainsList.includes(domain);
        });

        if (adminsWithInvalidDomains.length > 0) {
          const msg = `Domain Policy Violation: Admin emails [${adminsWithInvalidDomains.map(a => a.email).join(', ')}] do not match allowed domains [${allowedDomainsList.join(', ')}].`;
          setFormError(msg);
          toast.error(msg);
          return;
        }
      }
    } else {
      const msg = "At least one Allowed Identity Domain is required (Security Settings section).";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    const toastId = toast.loading("Provisioning Sovereign Organization...");

    try {
      const payload = {
        companyName: companyData.name,
        displayName: companyData.displayName,
        industry: companyData.industry,
        location: companyData.location,
        classification: companyData.classification,
        priority: companyData.priority,
        description: companyData.description,
        customerType: companyData.customerType,
        customerTier: companyData.customerTier,
        engagementTier: companyData.engagementTier,
        logoUrl: companyData.logoUrl,
        
        // Extended Identity & localization
        currency: companyData.currency,
        timezone: companyData.timezone,
        
        // Security
        authType: companyData.authType,
        allowedDomains: companyData.allowedDomains,
        mfaEnforced: companyData.mfaEnforced,
        
        // Governance
        complianceMode: companyData.complianceMode,
        retentionPolicyDays: companyData.retentionPolicyDays,
        
        // Billing
        planType: companyData.planType,
        contractStartDate: companyData.contractStartDate,
        billingEntity: companyData.billingEntity,
        billingEmail: companyData.billingEmail,
        
        // Capabilities
        aiEnabled: companyData.aiEnabled,
        studioAccess: companyData.studioAccess,
        apiAccess: companyData.apiAccess,
        marketplaceAccess: companyData.marketplaceAccess,
        
        // Ops
        tags: companyData.tags,
        accountOwner: companyData.accountOwner,
        onboardingSource: companyData.onboardingSource,
        slug: companyData.slug,

        // Workspace & Project
        workspaceName: companyData.workspaceName,
        workspaceSlug: companyData.workspaceSlug,
        workspaceLanguage: companyData.workspaceLanguage,
        workspaceRegion: companyData.workspaceRegion || companyData.location,
        isMultiWorkspaceEnabled: companyData.isMultiWorkspaceEnabled,
        bootstrapTemplate: companyData.bootstrapTemplate,
        projectName: companyData.projectName,

        tenantAdmins: onboardingAdmins,
        createdByEmail: currentUser.email,
        createdBy: currentUser.name
      };

      const res = await onboardTenantAction(payload);
      if (res.success) {
        toast.success("Organization Genesis Complete", { id: toastId });
        setIsCreating(false);
        const [updatedLogs] = await Promise.all([
           getGlobalAuditLogs(currentUser.customerId, "Customer"),
           refreshCustomers()
        ]);
        setGlobalLogs(updatedLogs);
      } else {
        toast.error(`Provisioning Failed: ${res.error}`, { id: toastId });
        setFormError(res.error || "Onboarding failed.");
      }
    } catch (e: any) {
      toast.error(`System Error: ${e.message}`, { id: toastId });
      setFormError(e.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
      "Active": "bg-primary/10 text-primary border-primary/20",
      "Pending Approval": "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30",
      "Suspended": "bg-destructive/10 text-destructive border-destructive/20"
    };
    const Icon = status === "Active" ? CheckCircle2 : status === "Pending Approval" ? Clock : Ban;

    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", config[status] || "bg-muted border-border")}>
        <Icon size={13} />
        {status}
      </span>
    );
  };


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[1000px] gap-6">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Manage Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage customer organizations
          </p>
        </div>

        <div className="flex items-center gap-3">
           <Button
             size="lg"
             onClick={handleCreateNew}
             className="px-6 font-semibold"
           >
              <Plus size={16} /> Add Customer
           </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Sidebar: Customer List */}
        <div className="w-80 shrink-0 flex flex-col bg-card border border-border rounded-lg overflow-hidden z-10">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <IconWrapper icon={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingCustomers ? (
               <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/20 border-t-foreground/50 animate-spin" />
                  <span className="text-xs text-muted-foreground font-medium">Loading...</span>
               </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 text-muted-foreground">
                <Building2 size={28} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No customers found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => selectCustomer(customer.id)}
                    className={cn(
                      "flex flex-col p-3 rounded-md cursor-pointer transition-all border",
                      selectedCustomerId === customer.id
                        ? "bg-primary/10 border-primary/20"
                        : "border-transparent hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 font-semibold text-xs",
                          selectedCustomerId === customer.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {(customer.companyName || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {customer.companyName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.industry || "—"}
                          </p>
                          {customer.slug && (
                            <p className="text-[10px] font-mono text-muted-foreground/60 truncate mt-0.5">
                              /{customer.slug}/login
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0 mt-1",
                        customer.status === "Active"
                          ? "bg-green-600"
                          : customer.status === "Suspended"
                          ? "bg-red-600"
                          : "bg-amber-600"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Detail & Form */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <AnimatePresence mode="popLayout">
            {isCreating ? (
              <motion.div
                key="create-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Form Header */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Create New Customer</h2>
                    <p className="text-sm text-muted-foreground mt-1">Fill in the required information below</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting || !companyData.name}
                      className="px-6"
                    >
                      {isSubmitting ? "Creating..." : "Create Customer"}
                    </Button>
                  </div>
                </div>

                {/* Form Content */}
                <form id="customerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-4xl space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Company Name *</label>
                          <input
                            required
                            type="text"
                            value={companyData.name}
                            onChange={e => handleNameChange(e.target.value)}
                            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                            placeholder="e.g. Acme Corp"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Domain Slug *</label>
                          <div className="flex gap-2">
                            <div className="px-3 py-2.5 bg-muted rounded-md text-sm text-muted-foreground whitespace-nowrap flex items-center">
                              app.platform.io/
                            </div>
                            <input
                              required
                              type="text"
                              value={companyData.slug}
                              onChange={e => setCompanyData({...companyData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                              className="flex-1 px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                              placeholder="company-name"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Organization Details */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Organization Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Industry</label>
                          <select
                            value={companyData.industry}
                            onChange={e => setCompanyData({...companyData, industry: e.target.value})}
                            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                          >
                            <option value="">Select industry...</option>
                            {lookupIndustries.map(i => (
                              <option key={i.id} value={i.label}>{i.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Region</label>
                          <select
                            value={companyData.location}
                            onChange={e => setCompanyData({...companyData, location: e.target.value})}
                            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                          >
                            <option value="">Select region...</option>
                            {lookupRegions.map(r => (
                              <option key={r.id} value={r.label}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Engagement Tier</label>
                          <select
                            value={companyData.engagementTier}
                            onChange={e => setCompanyData({...companyData, engagementTier: e.target.value})}
                            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                          >
                            {lookupEngagementTiers.map(t => (
                              <option key={t.id} value={t.label}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-foreground">Classification</label>
                          <select
                            value={companyData.classification}
                            onChange={e => setCompanyData({...companyData, classification: e.target.value})}
                            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                          >
                            {lookupClassifications.map(c => (
                              <option key={c.id} value={c.label}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Security Settings */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-foreground">Security Settings</h3>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Allowed Domains</label>
                        <input
                          type="text"
                          placeholder="e.g. acme.com, storage.acme.com"
                          value={companyData.allowedDomains || ""}
                          onChange={e => setCompanyData({...companyData, allowedDomains: e.target.value})}
                          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                        <p className="text-xs text-muted-foreground">Comma-separated list of domains allowed for user registration</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="mfaEnforced"
                          checked={companyData.mfaEnforced}
                          onChange={e => setCompanyData({...companyData, mfaEnforced: e.target.checked})}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                        <label htmlFor="mfaEnforced" className="text-sm font-medium text-foreground cursor-pointer">
                          Enforce multi-factor authentication
                        </label>
                      </div>
                    </div>

                    {/* Initial Administrators (Dual-Custody) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Initial Administrators</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Dual-custody policy requires a minimum of two (2) administrative identities for organizational onboarding.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addOnboardingAdmin}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
                        >
                          <Plus size={14} /> Add Administrator
                        </button>
                      </div>

                      <div className="space-y-4">
                        {onboardingAdmins.map((admin: any, index: number) => (
                          <div key={index} className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                  <UserCircle size={14} className="text-primary" />
                                </div>
                                <span className="text-sm font-semibold text-foreground">Administrator {index + 1}</span>
                              </div>
                              {onboardingAdmins.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeOnboardingAdmin(index)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                  title="Remove administrator"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                                <input
                                  required
                                  type="text"
                                  value={admin.firstName}
                                  onChange={e => updateOnboardingAdmin(index, 'firstName', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                  placeholder="First name"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                                <input
                                  required
                                  type="text"
                                  value={admin.lastName}
                                  onChange={e => updateOnboardingAdmin(index, 'lastName', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                  placeholder="Last name"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                                <input
                                  required
                                  type="email"
                                  value={admin.email}
                                  onChange={e => updateOnboardingAdmin(index, 'email', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                  placeholder="admin@company.com"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Job Title</label>
                                <input
                                  type="text"
                                  value={admin.jobTitle || ""}
                                  onChange={e => updateOnboardingAdmin(index, 'jobTitle', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                  placeholder="e.g. IT Manager"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Department</label>
                                <input
                                  type="text"
                                  value={admin.department || ""}
                                  onChange={e => updateOnboardingAdmin(index, 'department', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                  placeholder="e.g. Engineering"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Employment Type</label>
                                <select
                                  value={admin.employmentType}
                                  onChange={e => updateOnboardingAdmin(index, 'employmentType', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                >
                                  <option value="Full-time">Full-time</option>
                                  <option value="Part-time">Part-time</option>
                                  <option value="Contract">Contract</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Work Location</label>
                                <select
                                  value={admin.workLocation}
                                  onChange={e => updateOnboardingAdmin(index, 'workLocation', e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                >
                                  <option value="Office">Office</option>
                                  <option value="Remote">Remote</option>
                                  <option value="Hybrid">Hybrid</option>
                                </select>
                              </div>
                              <div className="flex items-end gap-3 pb-1">
                                <input
                                  type="checkbox"
                                  id={`mfa-admin-${index}`}
                                  checked={admin.mfaEnabled}
                                  onChange={e => updateOnboardingAdmin(index, 'mfaEnabled', e.target.checked)}
                                  className="w-4 h-4 rounded border-border accent-primary"
                                />
                                <label htmlFor={`mfa-admin-${index}`} className="text-sm font-medium text-foreground cursor-pointer">
                                  MFA Enabled
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {onboardingAdmins.length < 2 && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-md">
                          <AlertTriangle size={14} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                            Security Policy: A minimum of two (2) administrators is required for dual-custody compliance.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                          value={companyData.description || ""}
                          onChange={e => setCompanyData({...companyData, description: e.target.value})}
                          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                          rows={4}
                          placeholder="Add any additional notes or description..."
                        />
                      </div>
                    </div>

                    {/* Validation Error Display */}
                    {formError && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-sm font-medium text-destructive flex items-center gap-3">
                        <AlertTriangle size={16} className="flex-shrink-0" /> {formError}
                      </div>
                    )}
                  </div>
                </form>
              </motion.div>
            ) : fullDetail ? (
              <motion.div key={`detail-view-${fullDetail.id || 'new'}`} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      {fullDetail.logoUrl ? (
                        <img src={fullDetail.logoUrl} alt={fullDetail.companyName} className="w-full h-full object-contain p-1 rounded-md" />
                      ) : (
                        <Building2 size={24}/>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">{fullDetail.companyName}</h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">ID: {fullDetail.id.substring(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={fullDetail.status} />
                        <span className="text-xs text-muted-foreground">{fullDetail.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit size={14} /> Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusToggle(fullDetail.id, fullDetail.status)}
                          className={cn(
                            fullDetail.status === "Suspended" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                          )}
                        >
                          {fullDetail.status === "Suspended" ? "Restore Access" : "Suspend"}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="px-2">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Advanced Operations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleStatusToggle(fullDetail.id, fullDetail.status)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-muted/50"
                            >
                              {fullDetail.status === "Suspended" ? (
                                <RefreshCw size={14} className="text-emerald-500" />
                              ) : (
                                <Ban size={14} className="text-amber-500" />
                              )}
                              <span className="font-bold text-sm">{fullDetail.status === "Suspended" ? "Restore Organization" : "Soft Suspension"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleHardOffboard(fullDetail.id)}
                              className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 size={14} />
                              <span className="font-bold text-sm">Hard Decommission</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleExportAudit(fullDetail.id)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-muted/50"
                            >
                              <Download size={14} className="text-primary" />
                              <span className="font-bold text-sm">Generate Compliance Audit</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex bg-card/20">
                  {/* Left Column: Data */}
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar border-r border-border/40">
                    {isEditing ? (
                      <form onSubmit={handleUpdateCustomer} className="flex flex-col gap-5 max-w-2xl mx-auto pb-20">
                        <section className="flex flex-col gap-4">
                           <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                             <IconWrapper icon={Building} size={14}/> Registry Modification
                           </h3>
                           <div className="grid grid-cols-2 gap-4 bg-card/40 p-4 rounded-sm border border-border">
                             <div className="col-span-2 flex items-center gap-4 p-3 bg-muted/30 rounded-sm mb-2">
                                <div className="w-16 h-16 rounded-sm border border-border bg-background flex items-center justify-center overflow-hidden relative group">
                                   {fullDetail.logoUrl ? (
                                     <img src={fullDetail.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                   ) : (
                                     <Building size={24} className="opacity-10" />
                                   )}
                                   <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                      <Upload size={14} className="text-white" />
                                      <input type="file" className="hidden" accept="image/*" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setFullDetail({...fullDetail, logoUrl: reader.result as string});
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }} />
                                   </label>
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-sm font-black uppercase tracking-widest text-primary">Modify Organization Logo</span>
                                   <span className="text-sm text-muted-foreground">Click image to upload new branding asset.</span>
                                </div>
                             </div>
                             <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Company Name</label><input required type="text" value={fullDetail.companyName} onChange={e => setFullDetail({...fullDetail, companyName: e.target.value})} className="px-4 py-2.5 bg-background border border-border rounded-sm text-sm focus:ring-4 focus:ring-primary/10 transition-all" /></div>

                             <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Industry</label><select required value={fullDetail.industry || ""} onChange={e => setFullDetail({...fullDetail, industry: e.target.value})} className="px-4 py-2.5 bg-background border rounded-sm text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold">{lookupIndustries.map(i => <option key={i.id} value={i.label}>{i.label}</option>)}</select></div>
                             <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Region</label><select required value={fullDetail.location || ""} onChange={e => setFullDetail({...fullDetail, location: e.target.value})} className="px-4 py-2.5 bg-background border rounded-sm text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold">{lookupRegions.map(r => <option key={r.id} value={r.label}>{r.label}</option>)}</select></div>
                             <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Type</label><select required value={fullDetail.customerType || ""} onChange={e => setFullDetail({...fullDetail, customerType: e.target.value})} className="px-4 py-2.5 bg-background border rounded-sm text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold">
                               <option value="">Select Type...</option>
                               {lookupCustomerTypes.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                             </select></div>
                             <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Tier</label><select required value={fullDetail.customerTier || ""} onChange={e => setFullDetail({...fullDetail, customerTier: e.target.value})} className="px-4 py-2.5 bg-background border rounded-sm text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold">
                               <option value="">Select Tier...</option><option value="Free">Free</option><option value="Basic">Basic</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option>
                             </select></div>
                           </div>
                        </section>

                        <div className="flex items-center gap-3 pt-6 sticky bottom-0 bg-transparent backdrop-blur-xl py-6 border-t border-border mt-auto">
                          <Button type="submit" disabled={isSubmitting} className="flex-1 px-8 py-3 bg-primary text-white rounded-sm font-bold text-sm shadow-2xl shadow-primary/40 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] h-auto">
                            {isSubmitting ? "Executing..." : <><IconWrapper icon={Save} size={16}/> Push Changes to Registry</>}
                          </Button>
                          <Button variant="outline" type="button" onClick={() => setIsEditing(false)} className="px-8 py-3 bg-card border border-border rounded-sm font-bold text-sm hover:bg-muted transition-colors h-auto">Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-5 pb-20">
                        {/* Approval Alert for Pending Activation */}
                        {fullDetail.status === "Pending Approval" && (
                          <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-md bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center flex-shrink-0 text-yellow-700 dark:text-yellow-300">
                                <ShieldCheck size={20} />
                              </div>
                              <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Verification Required</h3>
                                <p className="text-sm text-yellow-800 dark:text-yellow-300 leading-relaxed mt-1">
                                  Initiated by <span className="font-semibold">{fullDetail.createdBy}</span>. Activation requires authorization from another administrator.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                disabled={fullDetail.createdBy === currentUser.email}
                                onClick={() => handleApproveActivation(fullDetail.id)}
                                size="sm"
                              >
                                {fullDetail.createdBy === currentUser.email ? "Awaiting Peer" : "Approve"}
                              </Button>
                              {fullDetail.createdBy === currentUser.email && (
                                <div className="px-2 py-1 bg-destructive/10 border border-destructive/20 rounded text-xs font-medium text-destructive flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  Self-approval not allowed
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Org Overview Cards */}
                        <section>
                          <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                             <IconWrapper icon={Sparkles} size={14}/> Core Organization Attributes
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                             <div className="p-4 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                <span className="text-sm text-foreground/90 font-black uppercase tracking-widest">Geo-Region</span>
                                <span className="text-sm font-black tracking-tight">{fullDetail.location}</span>
                                <IconWrapper icon={Globe} size={48} className="absolute -bottom-2 -right-2 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110" />
                             </div>
                             <div className="p-4 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                <span className="text-sm text-muted-foreground font-black uppercase tracking-widest">Service Level</span>
                                <span className="text-sm font-black tracking-tight text-primary">{fullDetail.customerType} — {fullDetail.customerTier}</span>
                                <IconWrapper icon={Zap} size={48} className="absolute -bottom-2 -right-2 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110" />
                             </div>
                             <div className="p-4 rounded-sm border border-border bg-card/60 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                <span className="text-sm text-muted-foreground font-black uppercase tracking-widest">Urgency Tier</span>
                                <span className={cn("text-sm font-semibold", fullDetail.priority === "Critical" ? "text-destructive" : "text-foreground")}>{fullDetail.priority}</span>
                                <IconWrapper icon={ShieldAlert} size={48} className="absolute -bottom-2 -right-2 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110" />
                             </div>
                          </div>
                        </section>

                        {/* Dedicated Portal URL */}
                        {fullDetail.slug && (
                          <section>
                            <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                              <IconWrapper icon={Globe} size={14}/> Customer Login Portal
                            </h4>
                            <div className="flex items-center gap-3 p-4 rounded-sm border border-primary/20 bg-primary/5">
                              <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Globe size={16} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Dedicated Portal URL</p>
                                <p className="text-sm font-mono font-semibold text-foreground truncate">
                                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'}/{fullDetail.slug}/login
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}/${fullDetail.slug}/login`;
                                    navigator.clipboard.writeText(url).then(() => toast.success("Portal URL copied"));
                                  }}
                                  className="px-3 py-1.5 text-xs font-bold bg-primary/10 border border-primary/20 text-primary rounded-sm hover:bg-primary/20 transition-colors"
                                >
                                  Copy URL
                                </button>
                                <a
                                  href={`/${fullDetail.slug}/login`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                  title="Open portal"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                          </section>
                        )}

                        {/* Administrators Grid */}
                        <section>
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                               <IconWrapper icon={Fingerprint} size={14}/> Principal Identity Grid
                            </h4>
                            <div className="flex items-center gap-4">
                               <span className="text-sm font-black text-muted-foreground bg-muted/50 border border-border px-3 py-1 rounded-sm uppercase tracking-widest">{admins.length} Entitled</span>
                               <Button 
                                 onClick={() => setIsAdminAdding(true)}
                                 className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-sm text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-auto"
                               >
                                  <Plus size={12}/> Invite Administrator
                               </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {(admins || []).length === 0 ? (
                              <div className="col-span-2 p-12 rounded-sm border border-dashed border-border flex flex-col items-center justify-center text-center gap-3 bg-muted/5 opacity-60">
                                 <IconWrapper icon={Fingerprint} size={32} className="opacity-20" />
                                 <p className="text-sm font-black uppercase tracking-widest leading-relaxed">No administrative identities found.<br/>Invite a relationship owner to bootstrap tenant RBAC.</p>
                              </div>
                            ) : admins.map((admin: any) => (
                              <div key={admin.id} className={cn(
                                "p-4 rounded-sm border border-border bg-card/40 backdrop-blur-sm relative transition-all hover:bg-card/60 hover:shadow-xl group overflow-hidden",
                                admin.status === "Disabled" && "opacity-60 grayscale-[0.5]"
                              )}>
                                {admin.status === "Disabled" && (
                                  <div className="absolute top-0 right-0 p-1 bg-muted text-[8px] font-black uppercase tracking-widest px-2 border-b border-l border-border">Disabled</div>
                                )}
                                <div className="flex items-start justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-12 h-12 rounded-sm bg-muted/60 flex items-center justify-center font-black text-sm text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500",
                                      admin.status === "Disabled" && "bg-muted text-muted-foreground"
                                    )}>
                                      {admin.firstName?.charAt(0) || "U"}{admin.lastName?.charAt(0) || "A"}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black tracking-tight">{admin.firstName} {admin.lastName}</span>
                                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">{admin.jobTitle || "Director"}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "px-2 py-1 rounded text-xs font-semibold border",
                                      admin.role === "Admin" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                                    )}>
                                      {admin.role}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-1 h-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical size={14} />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-card border-border">
                                        <DropdownMenuItem onClick={() => handleEditAdmin(admin)} className="flex items-center gap-2 cursor-pointer">
                                          <Edit size={12} />
                                          <span className="font-bold text-xs uppercase">Edit Identity</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleAdminStatus(admin)} className="flex items-center gap-2 cursor-pointer">
                                          <Ban size={12} className={admin.status === "Active" ? "text-amber-500" : "text-emerald-500"} />
                                          <span className="font-bold text-xs uppercase">{admin.status === "Active" ? "Disable Access" : "Enable Access"}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteAdmin(admin.id)} className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                                          <Trash2 size={12} />
                                          <span className="font-bold text-xs uppercase">Permanently Delete</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 pt-4 border-t border-border/40">
                                   <span className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Communications Hook</span>
                                   <span className="text-sm font-black text-primary truncate underline decoration-primary/20 underline-offset-4">{admin.email}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Infrastructure Overview: Tenants */}
                        <section>
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                               <IconWrapper icon={Server} size={14}/> Compute & Execution Infrastructure
                            </h4>
                            <span className="text-sm font-black text-muted-foreground bg-muted/50 border border-border px-3 py-1 rounded-sm uppercase tracking-widest">{(fullDetail.tenants || []).length} Environments</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {(fullDetail.tenants || []).map((tenant: any) => (
                              <div key={tenant.id} className="p-4 rounded-sm border border-border bg-card/40 backdrop-blur-md relative transition-all group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                   <IconWrapper icon={Monitor} size={64} />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={cn(
                                    "px-2 py-1 rounded text-xs font-semibold text-white",
                                    tenant.type === "PROD" ? "bg-destructive" : tenant.type === "UAT" ? "bg-amber-600" : "bg-primary"
                                  )}>
                                    {tenant.type}
                                  </div>
                                  <span className="text-sm font-black tracking-tight">{tenant.name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                                  {tenant.description || "Standard provisioned automation execution environment."}
                                </p>
                                <div className="flex items-center gap-4 pt-4 border-t border-border/40">
                                   <div className="flex flex-col">
                                      <span className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Active Services</span>
                                      <span className="text-sm font-black text-foreground">{(tenant.services || []).filter((s:any) => s.enabled).length} Enabled</span>
                                   </div>
                                   <div className="flex flex-col ml-auto text-right">
                                      <span className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest">Status</span>
                                      <span className={cn("text-sm font-semibold", tenant.status === "ACTIVE" ? "text-primary" : "text-destructive")}>
                                        {tenant.status}
                                      </span>
                                   </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Governance & Compliance: Audit Bundles + Offboarding */}
                        <section>
                          <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                             <IconWrapper icon={Shield} size={14}/> Governance & Decommissioning
                          </h4>

                          {/* Phase Tracker (Optional Visual) */}
                          {fullDetail.offboardingStatus && (
                            <div className="flex items-center gap-4 mb-8 px-4 py-3 bg-muted/30 border border-border rounded-md overflow-hidden">
                               <div className={cn("w-2 h-2 rounded-full", fullDetail.offboardingStatus === "OFFBOARDING_IN_PROGRESS" ? "bg-amber-600 animate-pulse" : "bg-primary")} />
                               <span className="text-sm font-medium text-foreground">
                                 {fullDetail.offboardingStatus?.replace(/_/g, " ")}
                               </span>
                               <div className="ml-auto flex items-center gap-2">
                                  <span className="text-sm/tight font-bold text-muted-foreground uppercase opacity-40">Governance Enforced</span>
                                </div>
                            </div>
                          )}

                          {fullDetail.offboardingStatus === "COMPLIANCE_PACKAGE_READY" ? (
                            /* PHASE 3: THE HUMAN GATE */
                            <div className={cn(
                              "p-5 rounded-sm border transition-all duration-500 relative overflow-hidden group",
                              (() => {
                                const hrs = fullDetail.offboardingExpiresAt ? (new Date(fullDetail.offboardingExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60) : 100;
                                if (hrs < 1) return "border-rose-600 bg-rose-600/10 shadow-[0_0_50px_-12px_rgba(225,29,72,0.3)] animate-pulse";
                                if (hrs < 6) return "border-rose-500/50 bg-rose-500/5";
                                return "border-emerald-500/30 bg-emerald-500/5";
                              })()
                            )}>
                               <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-sm blur-[100px]" />
                                                               {/* Escalation Overlay (1h / 6h) */}
                               {fullDetail.offboardingExpiresAt && (() => {
                                  const hrs = (new Date(fullDetail.offboardingExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
                                  if (hrs < 1) return (
                                    <div className="absolute top-0 right-0 px-10 py-3 bg-rose-600 text-white text-sm font-black uppercase tracking-[0.4em] rounded-bl-[2rem] shadow-[0_10px_40px_-10px_rgba(225,29,72,0.5)] z-20 animate-pulse border-b border-l border-rose-400/30">
                                       CORE TERMINATION IMMINENT
                                    </div>
                                  );
                                  if (hrs < 6) return (
                                    <div className="absolute top-0 right-0 px-8 py-2 bg-amber-500 text-white text-sm font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-lg z-20 border-b border-l border-amber-300/30">
                                       HIGH PRIORITY ESCALATION
                                    </div>
                                  );
                                  return null;
                                })()}

                               <div className="flex flex-col gap-4 relative z-10">
                                  <div className="flex items-center gap-4">
                                     <div className={cn(
                                       "w-16 h-16 rounded-sm flex items-center justify-center shadow-2xl transition-all duration-700",
                                       (() => {
                                          const hrs = (new Date(fullDetail.offboardingExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
                                          if (hrs < 1) return "bg-rose-600 text-white shadow-rose-600/40 ring-4 ring-rose-600/20";
                                          if (hrs < 6) return "bg-amber-500 text-white shadow-amber-500/30";
                                          return "bg-emerald-500 text-white shadow-emerald-500/20";
                                       })()
                                     )}>
                                        <ShieldAlert size={32} strokeWidth={2.5} />
                                     </div>
                                     <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                          <h3 className="text-3xl font-black tracking-tighter text-foreground leading-none">Compliance Package Ready</h3>
                                          {(() => {
                                            const hrs = (new Date(fullDetail.offboardingExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
                                            if (hrs < 1) return <span className="px-3 py-1 bg-destructive text-white text-xs font-semibold rounded animate-pulse">Critical</span>;
                                            if (hrs < 6) return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 text-xs font-semibold rounded border border-yellow-200 dark:border-yellow-500/30">Escalation</span>;
                                            return null;
                                          })()}
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.15em] mt-2 opacity-70">Materialized Governance Gate: Human Attestation Required</p>
                                     </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mt-6">
                                     <div className="p-4 rounded-sm bg-background/40 backdrop-blur-xl border border-border/40 flex flex-col gap-5 shadow-inner">
                                        <div className="flex flex-col gap-1.5">
                                           <span className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50 text-center sm:text-left">Integrity Hash (SHA-256)</span>
                                           <span className="text-sm font-mono text-foreground break-all bg-muted/30 p-4 rounded-sm border border-border/20 leading-relaxed uppercase shadow-sm">
                                             {fullDetail.compliancePackageHash || "Calculating..."}
                                           </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                           <span className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50 text-center sm:text-left">Retention Window</span>
                                           {(() => {
                                             const remainingMs = fullDetail.offboardingExpiresAt ? new Date(fullDetail.offboardingExpiresAt).getTime() - Date.now() : 0;
                                             const remainingHrs = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
                                             const remainingDays = Math.floor(remainingHrs / 24);
                                             
                                             let statusColor = "text-emerald-500";
                                             let warningText = "Artifact Secured";
                                             
                                             if (remainingHrs < 24) { statusColor = "text-amber-500"; warningText = "Auto-Restore Warning"; }
                                             if (remainingHrs < 1) { statusColor = "text-rose-600 font-black animate-pulse"; warningText = "Terminal Expiry"; }

                                             return (
                                               <div className="flex flex-col gap-0.5">
                                                 <span className={cn("text-sm font-black uppercase tracking-tight", statusColor)}>
                                                   Expires in {remainingDays > 0 ? `${remainingDays}d ` : ""}{remainingHrs % 24}h
                                                 </span>
                                                 <span className="text-sm/tight font-bold text-foreground/80 font-black uppercase tracking-widest opacity-60">
                                                   {warningText} — {new Date(fullDetail.offboardingExpiresAt).toLocaleDateString()}
                                                 </span>
                                               </div>
                                             );
                                           })()}
                                        </div>
                                        <Button 
                                           onClick={() => handleExportAudit(fullDetail.id)}
                                           className="mt-2 w-full px-6 py-3 bg-indigo-500 text-white rounded-sm text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 h-auto"
                                        >
                                           <IconWrapper icon={Download} size={14}/> Download Audit Bundle
                                        </Button>

                                     </div>

                                     <div className="p-4 rounded-sm bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                                        <div className="space-y-2">
                                           <h4 className="text-sm font-black text-rose-500 uppercase tracking-widest">Final Step</h4>
                                           <p className="text-sm text-muted-foreground leading-relaxed">
                                              By proceeding, you confirm that you have downloaded and archived the compliance bundle. 
                                              <span className="text-rose-500 font-bold block mt-2 underline">This action will permanently purge all customer infrastructure.</span>
                                           </p>
                                        </div>
                                         <div className="flex flex-col gap-2 mt-6">
                                           <Button 
                                              variant="destructive"
                                              size="lg"
                                              onClick={() => handleFinalDecommission(fullDetail.id)}
                                              className="w-full font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-600/30 hover:scale-[1.05] h-auto"
                                           >
                                              I have verified - Proceed to Deletion
                                           </Button>
                                           <Button 
                                              variant="ghost"
                                              onClick={() => handleCancelOffboarding(fullDetail.id)}
                                              className="text-sm font-bold text-foreground/80 font-black uppercase tracking-widest hover:text-foreground mt-2 h-auto"
                                           >
                                              Cancel Offboarding
                                           </Button>
                                         </div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          ) : fullDetail.offboardingStatus === "OFFBOARDING_IN_PROGRESS" ? (
                            /* PHASE 2: PROCESSING */
                            <div className="p-12 rounded-sm border border-border bg-card/40 flex flex-col items-center justify-center text-center gap-4">
                               <div className="w-20 h-20 rounded-sm bg-primary/5 flex items-center justify-center text-primary relative">
                                  <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-sm animate-spin" />
                                  <IconWrapper icon={ShieldAlert} size={32} className="animate-pulse" />
                                </div>
                                <div className="space-y-2 max-w-sm">
                                   <h3 className="text-xl font-black tracking-tight tracking-tight">Securing Forensic Data...</h3>
                                   <p className="text-sm text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">
                                     Compiling audit logs, service states, and identity manifests into a cryptographically signed bundle.
                                   </p>
                                </div>
                                <div className="w-48 h-1 bg-muted rounded-sm overflow-hidden mt-4">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: "100%" }}
                                      transition={{ duration: 15, ease: "linear" }}
                                      className="h-full bg-primary"
                                   />
                                </div>
                            </div>
                          ) : (
                            /* DEFAULT STATE (PHASE 1 Initiation) */
                            <>
                              {/* --- Log & Artifact Vault --- */}
                              <section className="mt-8 space-y-6">
                                <div className="flex items-center justify-between px-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-sm text-primary">
                                      <HardDrive size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                      <h3 className="text-xl font-black tracking-tight uppercase">Log & Artifact Vault</h3>
                                      <span className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">Immutable Audit Attachments</span>
                                    </div>
                                  </div>
                                  
                                  <label className="cursor-pointer group">
                                    <input type="file" className="hidden" onChange={handleLogUpload} disabled={isUploading} />
                                    <div className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-sm text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                                      {isUploading ? <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-sm animate-spin" /> Syncing...</> : <><Upload size={14}/> Upload Manifest</>}
                                    </div>
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(logFiles || []).length === 0 ? (
                                    <div className="md:col-span-2 p-12 rounded-sm border border-dashed border-border flex flex-col items-center justify-center text-center gap-4 bg-muted/5">
                                      <FileText size={40} className="text-muted-foreground opacity-20" />
                                      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-40">Zero artifacts in vault. Upload logs or forensic data.</p>
                                    </div>
                                  ) : logFiles.map((file: any) => (
                                    <div key={file.id} className="p-5 rounded-sm border border-border bg-card/40 hover:bg-card/60 transition-all flex items-center justify-between group">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                          <IconWrapper icon={FileText} size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-black tracking-tight uppercase truncate max-w-[120px]">{file.fileName}</span>
                                          <span className="text-sm font-bold text-muted-foreground uppercase opacity-60">
                                            {(Number(file.fileSize) / 1024).toFixed(1)} KB — {new Date(file.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-primary transition-colors h-auto">
                                        <Download size={14} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </section>

                              <h4 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-8 mt-12 flex items-center gap-2">
                                 <IconWrapper icon={Shield} size={14}/> Governance & Decommissioning
                              </h4>
                              
                              {/* Decommissioning actions moved to header dropdown */}
                              {!fullDetail.offboardingStatus && (
                                <div className="p-8 rounded-sm border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center text-center gap-3 opacity-60">
                                   <IconWrapper icon={Shield} size={32} className="opacity-20" />
                                   <p className="text-sm font-black uppercase tracking-widest leading-relaxed">Infrastructure Governance Active.<br/>Use the action menu above for decommissioning flows.</p>
                                </div>
                              )}
                            </>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : loadingDetail ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-foreground/50 animate-spin" />
                <p className="text-sm font-medium">Loading organization...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Building2 size={48} className="opacity-10 mb-4"/>
                <p className="text-sm font-medium">Select an organization to manage operations</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Right Sidebar: Operation Log (Audit Trail) */}
        <div className="w-[300px] shrink-0 flex flex-col bg-card/40 backdrop-blur-md rounded-sm border border-border shadow-sm overflow-hidden transition-all duration-500">
           <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <History size={14} className="text-primary" />
                 <span className="text-sm font-black uppercase tracking-widest text-foreground/80">Operation Log</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter">Live</span>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {globalLogs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                    <Activity size={32} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Recent Activity</span>
                 </div>
              ) : (
                 globalLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="group flex gap-3 relative pb-4">
                       {idx !== globalLogs.length - 1 && (
                          <div className="absolute left-[7px] top-4 bottom-0 w-[2px] bg-border/40 group-hover:bg-primary/20 transition-colors" />
                       )}
                       <div className="mt-1">
                          <div className={cn(
                             "w-4 h-4 rounded-sm border-2 border-card shadow-sm flex items-center justify-center relative z-10 transition-transform group-hover:scale-110",
                             log.severity === "High" ? "bg-rose-500" : log.severity === "Warning" ? "bg-amber-500" : "bg-primary"
                          )} />
                       </div>
                       <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                             <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter truncate">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                             </span>
                             <span className="text-[9px] font-black text-primary/50 uppercase tracking-widest px-1 bg-primary/5 rounded-[2px]">{log.actor === "Platform Admin" ? "P-ADMIN" : log.actor.substring(0,8)}</span>
                          </div>
                          <span className="text-sm font-black text-foreground/90 uppercase tracking-tight leading-none truncate">
                             {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter opacity-70 truncate">
                             {log.target}
                          </span>
                       </div>
                    </div>
                 ))
              )}
           </div>
           
           <div className="p-4 border-t border-border bg-muted/10">
              <button 
                type="button"
                onClick={async () => {
                   const logs = await getGlobalAuditLogs(currentUser.customerId, "Customer");
                   setGlobalLogs(logs);
                }}
                className="w-full py-2 bg-muted/50 border border-border rounded-md text-xs font-semibold hover:bg-muted transition-colors"
              >
                 Refresh Logs
              </button>
           </div>
        </div>
      </div>

      {/* --- INVITE ADMINISTRATOR MODAL --- */}
      <AnimatePresence>
        {isAdminAdding ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-xl bg-card border border-border shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] rounded-sm overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-5 border-b border-border bg-muted/20">
                 <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                       <span className="text-sm font-black uppercase tracking-[0.4em] text-primary">Identity Orchestration</span>
                       <h3 className="text-3xl font-black uppercase tracking-tighter">{isAdminEditing ? "Modify Administrator" : "Invite Administrator"}</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setIsAdminAdding(false);
                      setIsAdminEditing(false);
                      setEditingAdminId(null);
                      setNewAdmin({
                        firstName: "", lastName: "", email: "", jobTitle: "", department: "", 
                        role: "Admin", employmentType: "Full-time", workLocation: "Office", mfaEnabled: false, status: "Active"
                      });
                    }} className="p-3 bg-muted/40 rounded-sm hover:bg-muted transition-colors h-auto"><X size={20}/></Button>
                 </div>
              </div>

              <form onSubmit={handleAddAdmin} className="p-5 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</label>
                       <input autoFocus required type="text" value={newAdmin.firstName} onChange={e => setNewAdmin({...newAdmin, firstName: e.target.value})} className="px-5 py-3.5 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</label>
                       <input required type="text" value={newAdmin.lastName} onChange={e => setNewAdmin({...newAdmin, lastName: e.target.value})} className="px-5 py-3.5 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                       <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                       <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="px-5 py-3.5 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Administrative Role</label>
                       <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="px-5 py-3.5 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer">
                          <option value="Admin">Admin</option>
                          <option value="Business Owner">Business Owner</option>
                          <option value="IT Owner">IT Owner</option>
                       </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Work Location</label>
                       <input type="text" value={newAdmin.workLocation} onChange={e => setNewAdmin({...newAdmin, workLocation: e.target.value})} className="px-5 py-3.5 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight" placeholder="e.g. Remote, Head Office" />
                    </div>
                 </div>

                 <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-sm border border-border/40">
                    <div className="p-2 bg-emerald-500/10 rounded-sm text-emerald-500"><ShieldCheck size={20}/></div>
                    <div className="flex flex-col flex-1">
                       <span className="text-sm font-black uppercase tracking-widest">Enforce MFA Baseline</span>
                       <span className="text-sm font-bold text-muted-foreground uppercase opacity-60">Mandatory for all principal identities</span>
                    </div>
                    <div className={cn("w-10 h-6 rounded-sm p-1 transition-colors cursor-pointer", newAdmin.mfaEnabled ? "bg-emerald-500" : "bg-muted")} onClick={() => setNewAdmin({...newAdmin, mfaEnabled: !newAdmin.mfaEnabled})}>
                       <div className={cn("w-4 h-4 bg-white rounded-sm transition-transform", newAdmin.mfaEnabled && "translate-x-4")} />
                    </div>
                 </div>

                 {formError && (
                   <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-sm text-sm font-bold text-rose-500 uppercase tracking-widest flex items-center gap-3">
                      <AlertTriangle size={16} /> {formError}
                   </div>
                 )}

                 <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-primary text-white rounded-sm text-sm font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all h-auto">
                       {isSubmitting ? "Syncing Identity..." : (isAdminEditing ? "Update Administrator" : "Finalize Invitation")}
                    </Button>
                    <Button variant="outline" type="button" onClick={() => {
                      setIsAdminAdding(false);
                      setIsAdminEditing(false);
                      setEditingAdminId(null);
                      setNewAdmin({
                        firstName: "", lastName: "", email: "", jobTitle: "", department: "", 
                        role: "Admin", employmentType: "Full-time", workLocation: "Office", mfaEnabled: false, status: "Active"
                      });
                    }} className="px-10 py-4 bg-card border border-border rounded-sm text-sm font-black uppercase tracking-widest hover:bg-muted transition-all h-auto">Cancel</Button>
                 </div>
              </form>
              </motion.div>
            </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
