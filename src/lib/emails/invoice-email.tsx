export interface EmailTemplateProps {
  invoiceNumber: string;
  clientName: string;
  amount: string;
  dueDate: string;
  companyName: string;
  paymentLink?: string;
}

export default function InvoiceEmail(props: EmailTemplateProps): React.ReactElement {
  return <div>Invoice Email Template</div>;
}
