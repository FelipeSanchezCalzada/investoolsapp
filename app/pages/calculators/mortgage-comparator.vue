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
    { label: 'Home', to: { name: PAGE_NAMES.INDEX } },
    { label: 'Comparador de hipotecas' },
  ],
})

const { mortgages, activeTabId, addMortgage, loadExamples } = useMortgageComparator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6">
    <ToolPageHeader title="Comparador de hipotecas">
      La TAE que publica el banco no cuenta lo que te cuestan de verdad las vinculaciones: solo
      mete las obligatorias y a precio de tarifa. Aquí se calculan tres TAE —la oficial, la real
      con lo que vas a contratar de verdad y la que tendrías sin vinculaciones opcionales— y se
      imputa de cada producto solo el sobrecoste frente a contratarlo por tu cuenta.
    </ToolPageHeader>

    <GlobalSettingsDialog />

    <Card v-if="!mortgages.length">
      <CardHeader>
        <CardTitle class="text-lg">
          Todavía no hay ninguna oferta
        </CardTitle>
        <CardDescription>
          Añade las hipotecas que estés valorando, con sus condiciones, gastos y vinculaciones.
          También puedes cargar dos ejemplos con cifras plausibles del mercado español —una fija y
          una variable— para ver cómo funciona la herramienta. No son ofertas reales ni una
          recomendación.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button @click="addMortgage()">
          <Plus class="mr-1 size-4" />
          Añadir hipoteca
        </Button>
        <Button
          variant="outline"
          @click="loadExamples"
        >
          <FileStack class="mr-1 size-4" />
          Cargar ejemplo
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
