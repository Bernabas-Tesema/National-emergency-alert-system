import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AreasTab from './settings/AreasTab'
import GatewaysTab from './settings/GatewaysTab'
import LanguagesTab from './settings/LanguagesTab'
import SeverityRulesTab from './settings/SeverityRulesTab'
import TemplatesTab from './settings/TemplatesTab'

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
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="severity">Severity rules</TabsTrigger>
          <TabsTrigger value="areas">Regions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
        </TabsList>
        <TabsContent value="languages" className="pt-4">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="severity" className="pt-4">
          <SeverityRulesTab />
        </TabsContent>
        <TabsContent value="areas" className="pt-4">
          <AreasTab />
        </TabsContent>
        <TabsContent value="templates" className="pt-4">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="gateways" className="pt-4">
          <GatewaysTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}