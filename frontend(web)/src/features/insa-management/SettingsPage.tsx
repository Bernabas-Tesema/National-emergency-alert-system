import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LanguagesTab from './settings/LanguagesTab'
import SeverityRulesTab from './settings/SeverityRulesTab'

export default function SettingsPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Rules and options that apply to the whole system. Unsaved changes are
          lost when you switch tabs, so save first.
        </p>
      </div>

      <Tabs defaultValue="languages">
        <TabsList>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="severity">Severity rules</TabsTrigger>
        </TabsList>
        <TabsContent value="languages" className="pt-4">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="severity" className="pt-4">
          <SeverityRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}