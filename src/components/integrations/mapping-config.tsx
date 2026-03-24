'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Save,
  RotateCcw,
  Info,
  Users,
  FileText,
  CreditCard,
  AlertCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { FieldMapping, IntegrationType, INTEGRATIONS } from '@/lib/integrations/types';

interface MappingConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: IntegrationType;
  currentMapping?: FieldMapping;
  onSave: (mapping: FieldMapping) => void;
}

// Default field mappings for each integration type
const defaultMappings: Record<IntegrationType, FieldMapping> = {
  quickbooks: {
    clientName: 'DisplayName',
    clientEmail: 'PrimaryEmailAddr.Address',
    clientPhone: 'PrimaryPhone.FreeFormNumber',
    clientCompany: 'CompanyName',
    clientAddress: 'BillAddr.Line1',
    invoiceReference: 'DocNumber',
    invoiceDescription: 'Line[0].Description',
    invoiceAmount: 'TotalAmt',
    invoiceCurrency: 'CurrencyRef.value',
    invoiceIssueDate: 'TxnDate',
    invoiceDueDate: 'DueDate',
    invoiceStatus: 'Balance',
    paymentAmount: 'TotalAmt',
    paymentDate: 'TxnDate',
    paymentReference: 'PaymentRefNum',
  },
  xero: {
    clientName: 'Name',
    clientEmail: 'EmailAddress',
    clientPhone: 'Phones[0].PhoneNumber',
    clientCompany: 'Name',
    clientAddress: 'Addresses[0].AddressLine1',
    invoiceReference: 'InvoiceNumber',
    invoiceDescription: 'LineItems[0].Description',
    invoiceAmount: 'Total',
    invoiceCurrency: 'CurrencyCode',
    invoiceIssueDate: 'Date',
    invoiceDueDate: 'DueDate',
    invoiceStatus: 'Status',
    paymentAmount: 'Amount',
    paymentDate: 'Date',
    paymentReference: 'Reference',
  },
  sage: {
    clientName: 'name',
    clientEmail: 'email',
    clientPhone: 'telephone',
    clientCompany: 'company_name',
    clientAddress: 'address_line_1',
    invoiceReference: 'invoice_number',
    invoiceDescription: 'invoice_lines[0].description',
    invoiceAmount: 'total_amount',
    invoiceCurrency: 'currency',
    invoiceIssueDate: 'date',
    invoiceDueDate: 'due_date',
    invoiceStatus: 'status',
    paymentAmount: 'total_amount',
    paymentDate: 'date',
    paymentReference: 'reference',
  },
  wave: {
    clientName: 'name',
    clientEmail: 'email',
    clientPhone: 'phone',
    clientCompany: 'name',
    clientAddress: 'address',
    invoiceReference: 'invoice_number',
    invoiceDescription: 'description',
    invoiceAmount: 'total',
    invoiceCurrency: 'currency',
    invoiceIssueDate: 'invoice_date',
    invoiceDueDate: 'due_date',
    invoiceStatus: 'status',
    paymentAmount: 'amount',
    paymentDate: 'date',
    paymentReference: 'reference',
  },
};

// External fields available from each integration
const externalFields: Record<IntegrationType, Record<string, string[]>> = {
  quickbooks: {
    client: ['DisplayName', 'CompanyName', 'PrimaryEmailAddr.Address', 'PrimaryPhone.FreeFormNumber', 'BillAddr.Line1', 'BillAddr.City', 'BillAddr.Country', 'Notes', 'Active'],
    invoice: ['DocNumber', 'TxnDate', 'DueDate', 'TotalAmt', 'Balance', 'CurrencyRef.value', 'Line[0].Description', 'CustomerRef.value', 'Status'],
    payment: ['Id', 'TxnDate', 'TotalAmt', 'PaymentRefNum', 'PaymentMethodRef.name'],
  },
  xero: {
    client: ['Name', 'CompanyName', 'EmailAddress', 'Phones[0].PhoneNumber', 'Addresses[0].AddressLine1', 'Addresses[0].City', 'Addresses[0].Country', 'IsSupplier'],
    invoice: ['InvoiceNumber', 'Date', 'DueDate', 'Total', 'AmountDue', 'AmountPaid', 'CurrencyCode', 'Status', 'LineItems[0].Description'],
    payment: ['PaymentID', 'Date', 'Amount', 'Reference', 'PaymentMethod'],
  },
  sage: {
    client: ['name', 'company_name', 'email', 'telephone', 'address_line_1', 'city', 'country', 'notes'],
    invoice: ['invoice_number', 'date', 'due_date', 'total_amount', 'total_paid', 'status', 'currency'],
    payment: ['id', 'date', 'total_amount', 'reference', 'payment_method'],
  },
  wave: {
    client: ['name', 'email', 'phone', 'address', 'city', 'country'],
    invoice: ['invoice_number', 'invoice_date', 'due_date', 'total', 'status', 'currency'],
    payment: ['id', 'date', 'amount', 'reference', 'method'],
  },
};

// RelancePro internal fields
const internalFields = {
  client: [
    { key: 'name', label: 'Client Name', required: true },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'company', label: 'Company Name', required: false },
    { key: 'address', label: 'Address', required: false },
  ],
  invoice: [
    { key: 'reference', label: 'Invoice Reference', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'currency', label: 'Currency', required: true },
    { key: 'issueDate', label: 'Issue Date', required: false },
    { key: 'dueDate', label: 'Due Date', required: true },
  ],
  payment: [
    { key: 'amount', label: 'Payment Amount', required: true },
    { key: 'date', label: 'Payment Date', required: true },
    { key: 'reference', label: 'Reference', required: false },
  ],
};

export function MappingConfig({
  open,
  onOpenChange,
  type,
  currentMapping,
  onSave,
}: MappingConfigProps) {
  // Initialize state with props or defaults
  const getInitialMapping = () => currentMapping || defaultMappings[type];
  
  const [mapping, setMapping] = useState<FieldMapping>(getInitialMapping);
  const [activeTab, setActiveTab] = useState('client');
  const [hasChanges, setHasChanges] = useState(false);
  const [customMappings, setCustomMappings] = useState<Array<{ internal: string; external: string }>>([]);

  const config = INTEGRATIONS[type];

  // Update mapping when props change - using a ref to track previous values
  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) {
      // Dialog just opened, reset state asynchronously
      const timer = setTimeout(() => {
        setMapping(getInitialMapping());
        setHasChanges(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    prevOpen.current = open;
  }, [open, type, currentMapping]);

  const handleFieldChange = (internalField: string, externalField: string) => {
    setMapping(prev => ({
      ...prev,
      [internalField]: externalField,
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setMapping(defaultMappings[type]);
    setCustomMappings([]);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(mapping);
    onOpenChange(false);
  };

  const addCustomMapping = () => {
    setCustomMappings(prev => [...prev, { internal: '', external: '' }]);
    setHasChanges(true);
  };

  const removeCustomMapping = (index: number) => {
    setCustomMappings(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const renderFieldMappingRow = (
    internalField: { key: string; label: string; required: boolean },
    externalKey: string
  ) => {
    const currentValue = mapping[externalKey as keyof FieldMapping] || '';
    const fields = externalFields[type][activeTab as keyof typeof externalFields[typeof type]] || [];

    return (
      <TableRow key={internalField.key}>
        <TableCell>
          <div className="flex items-center gap-2">
            <span>{internalField.label}</span>
            {internalField.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </TableCell>
        <TableCell>
          <Select
            value={currentValue}
            onValueChange={(value) => handleFieldChange(externalKey, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {fields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          {currentValue ? (
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3" />
              Mapped
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Mapped
            </Badge>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Field Mapping Configuration
          </DialogTitle>
          <DialogDescription>
            Map fields from {config?.name} to RelancePro Africa. This determines how data is synced between systems.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">About Field Mapping</p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                Field mapping determines how data from {config?.name} is translated into RelancePro Africa.
                Required fields must be mapped for the sync to work correctly.
              </p>
            </div>
          </div>

          {/* Tabs for different entity types */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="client" className="gap-2">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            {/* Client Mapping */}
            <TabsContent value="client">
              <Card className="border-0 shadow-none">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RelancePro Field</TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>{config?.name} Field</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {internalFields.client.map((field) => 
                        renderFieldMappingRow(field, `client${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Invoice Mapping */}
            <TabsContent value="invoice">
              <Card className="border-0 shadow-none">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RelancePro Field</TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>{config?.name} Field</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {internalFields.invoice.map((field) => 
                        renderFieldMappingRow(field, `invoice${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Payment Mapping */}
            <TabsContent value="payment">
              <Card className="border-0 shadow-none">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RelancePro Field</TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>{config?.name} Field</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {internalFields.payment.map((field) => 
                        renderFieldMappingRow(field, `payment${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Custom Mappings */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="custom">
              <AccordionTrigger className="text-sm font-medium">
                Custom Field Mappings
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Add custom field mappings for additional data fields not covered by the default mappings.
                  </p>
                  
                  {customMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Internal field name"
                        value={mapping.internal}
                        onChange={(e) => {
                          const newMappings = [...customMappings];
                          newMappings[index].internal = e.target.value;
                          setCustomMappings(newMappings);
                          setHasChanges(true);
                        }}
                        className="flex-1"
                      />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="External field path"
                        value={mapping.external}
                        onChange={(e) => {
                          const newMappings = [...customMappings];
                          newMappings[index].external = e.target.value;
                          setCustomMappings(newMappings);
                          setHasChanges(true);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomMapping(index)}
                        className="text-destructive"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button variant="outline" onClick={addCustomMapping}>
                    Add Custom Mapping
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Advanced Options */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm font-medium">
                Advanced Options
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-create Missing Clients</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create clients in RelancePro if they don't exist during invoice sync
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Update Existing Records</Label>
                      <p className="text-sm text-muted-foreground">
                        Update existing records with new data from {config?.name}
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Skip Invalid Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Skip records with invalid or missing required fields instead of failing the sync
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MappingConfig;
