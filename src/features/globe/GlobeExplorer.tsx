import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

import { useAppState } from '../../app/app-state';

type CountryFeature = Feature<Geometry, { alpha2: string; name: string; }>;

export default function GlobeExplorer({
  onCountrySelect,
}: {
  onCountrySelect: (alpha2: string) => void;
}) {
  const { t } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [selected, setSelected] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL('data/generated/countries.geo.json', document.baseURI);
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Geometry request failed: ${response.status}`);
        return response.json() as Promise<
          FeatureCollection<Geometry, CountryFeature['properties']>
        >;
      })
      .then((collection) => {
        if (!Array.isArray(collection.features) || collection.features.length === 0) {
          throw new Error('Country geometry is empty.');
        }
        setCountries(collection.features as CountryFeature[]);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (loadFailed) throw new Error('Country geometry could not be loaded.');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.floor(entry.contentRect.width)));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className='globe-shell' ref={containerRef}>
      <p className='globe-help'>{t('globeHelp')}</p>
      {countries.length === 0
        ? <div className='globe-placeholder'>{t('globeLoading')}</div>
        : (
          <Globe
            width={width}
            height={Math.min(520, Math.max(320, width * 0.68))}
            backgroundColor='rgba(0,0,0,0)'
            globeImageUrl={null}
            showGraticules
            showAtmosphere
            atmosphereColor='#6fe7ff'
            atmosphereAltitude={0.18}
            polygonsData={countries}
            polygonCapColor={(item) =>
              (item as CountryFeature).properties.alpha2 === selected
                ? 'rgba(164, 125, 255, .95)'
                : 'rgba(37, 91, 154, .82)'}
            polygonSideColor={() => 'rgba(7, 11, 24, .8)'}
            polygonStrokeColor={() => 'rgba(135, 232, 255, .7)'}
            polygonAltitude={(item) =>
              (item as CountryFeature).properties.alpha2 === selected ? 0.03 : 0.008}
            polygonLabel={(item) => (item as CountryFeature).properties.name}
            polygonsTransitionDuration={220}
            onPolygonClick={(item) => {
              const alpha2 = (item as CountryFeature).properties.alpha2;
              setSelected(alpha2);
              onCountrySelect(alpha2);
            }}
          />
        )}
    </div>
  );
}
