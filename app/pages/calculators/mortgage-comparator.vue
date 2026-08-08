<script setup lang="ts">
import { FileStack, Plus } from '@lucide/vue'
import { PAGE_NAMES } from '~/pages/routeNames'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import ComparisonPanel from '~/components/calculators/mortgage-comparator/ComparisonPanel.vue'
import GlobalSettingsDialog from '~/components/calculators/mortgage-comparator/GlobalSettingsDialog.vue'
import MortgagePanel from '~/components/calculators/mortgage-comparator/MortgagePanel.vue'
import MortgageTabs from '~/components/calculators/mortgage-comparator/MortgageTabs.vue'
import { COMPARISON_TAB_ID } from '~/composables/useMortgageComparator'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.MORTGAGE_COMPARATOR,
  breadcrumb: [
    { labelKey: 'layout.breadcrumb.home', to: { name: PAGE_NAMES.INDEX } },
    { labelKey: 'tools.mortgageComparator.navTitle' },
  ],
})

const { mortgages, activeTabId, addMortgage, loadExamples } = useMortgageComparator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6">
    <ToolPageHeader :title="$t('tools.mortgageComparator.title')">
      {{ $t('mortgage.intro') }}
    </ToolPageHeader>

    <GlobalSettingsDialog />

    <Card v-if="!mortgages.length">
      <CardHeader>
        <CardTitle class="text-lg">
          {{ $t('mortgage.empty.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('mortgage.empty.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button @click="addMortgage()">
          <Plus class="mr-1 size-4" />
          {{ $t('mortgage.empty.addMortgage') }}
        </Button>
        <Button
          variant="outline"
          @click="loadExamples"
        >
          <FileStack class="mr-1 size-4" />
          {{ $t('mortgage.empty.loadExample') }}
        </Button>
      </CardContent>
    </Card>

    <Tabs
      v-else
      v-model="activeTabId"
      class="gap-4"
    >
      <MortgageTabs />

      <TabsContent
        v-for="mortgage in mortgages"
        :key="mortgage.id"
        :value="mortgage.id"
      >
        <MortgagePanel :mortgage="mortgage" />
      </TabsContent>

      <TabsContent :value="COMPARISON_TAB_ID">
        <ComparisonPanel />
      </TabsContent>
    </Tabs>
  </div>
</template>
