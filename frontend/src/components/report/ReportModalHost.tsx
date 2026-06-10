import { useNavigate } from 'react-router-dom';
import { useReportModal } from '@/contexts/ReportModalContext';
import { ReportModal } from '@/components/report/ReportModal';

export function ReportModalHost() {
  const { isOpen, accountId, close } = useReportModal();
  const navigate = useNavigate();

  return (
    <ReportModal
      open={isOpen}
      accountId={accountId}
      onClose={close}
      onSubmitted={(submittedAccountId) => {
        close();
        navigate(`/accounts/${submittedAccountId}`);
      }}
    />
  );
}
