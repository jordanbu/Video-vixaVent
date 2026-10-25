// ES data dictionary assembly: template/sound/data display names for tData().
import templatesData from './templates-data';
import dataTemplates from './data-templates';
import dataFields1 from './data-fields-1';
import dataFields2 from './data-fields-2';
import dataFields3 from './data-fields-3';
import dataSounds from './data-sounds';

export const ES_DATA: Record<string, string> = Object.assign(
  {},
  dataTemplates, dataFields1, dataFields2, dataFields3, dataSounds,
  // Hand-tuned names win over the generated ones.
  templatesData,
);
