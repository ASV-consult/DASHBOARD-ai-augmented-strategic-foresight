import { ForesightProvider, useForesight } from '@/contexts/ForesightContext';
import { FileUpload } from '@/components/FileUpload';
import { Dashboard } from '@/components/Dashboard';

function IndexContent() {
  const { isLoaded } = useForesight();
  
  return isLoaded ? <Dashboard /> : <FileUpload />;
}

const Index = () => {
  return (
    <ForesightProvider>
      <IndexContent />
    </ForesightProvider>
  );
};

export default Index;
