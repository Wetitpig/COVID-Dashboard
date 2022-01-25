var Landkreise;
var LandkreisJSON;
var bundeslaenderDataDEU;

const casesDEU = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => LandkreisJSON.resetStyle(e.target),
			click: () => {
				var fxKreis = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.BEZ_GEN);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesDEU.lastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataDEU[parseInt(feature.properties['BL_ID'], 10) - 1];
					$('#LKlabel').html(feature.properties.BL);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesDEU.lastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxBund = () => {
					$('#LKlabel').html('Deutschland');
					$('#pop').html(NUTS1Data.DE.EWZ.toLocaleString());
					casesTableFill(NUTS1Data.DE);

					$('.lastUpdated').html(casesDEU.lastUpdate);

					bgColor = mapStyle.incidence((NUTS1Data.DE.cases7 / NUTS1Data.DE.EWZ) * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKreis(); break;
						case 1: fxLand(); break;
						case 2: fxBund(); break;
					}
					resetTableColours(bgColor);
				});

				fxKreis();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		if (LandkreisJSON !== undefined) {
			LandkreisJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LandkreisJSON)
		}
		LandkreisJSON = L.geoJSON({
			type: Landkreise.type,
			crs: Landkreise.crs,
			features: Landkreise.features.filter(value => value.properties.RS != '11000')
		}, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesDEU.handleClick
		});
		LandkreisJSON.addEventListener('add', layerLoaded);
		LandkreisJSON.addTo(map);
	}
};


const vacDEU = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => LandkreisJSON.resetStyle(e.target),
			click: () => {
				var fxKreis = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.BEZ + ' ' + toPrint.GEN);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacDEU.lastUpdate);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataDEU[parseInt(feature.properties['BL_ID'], 10) - 1];
					$('#LKlabel').html(feature.properties.BL);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacDEU.lastUpdate);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxBund = () => {
					$('#LKlabel').html('Deutschland');
					vacTableFill(NUTS1Data.DE);

					$('.lastUpdated').html(vacDEU.lastUpdate);

					bgColor = mapStyle.coverage(NUTS1Data.DE.dose2 / NUTS1Data.DE.EWZ * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKreis(); break;
						case 1: fxLand(); break;
						case 2: fxBund(); break;
					}
					resetTableColours(bgColor);
				});

				fxKreis();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		if (LandkreisJSON !== undefined) {
			LandkreisJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LandkreisJSON)
		}
		LandkreisJSON = L.geoJSON({
			type: Landkreise.type,
			crs: Landkreise.crs,
			features: Landkreise.features.filter(value => value.properties.RS.substring(0,2) != '11' || value.properties.RS == '11000')
		}, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacDEU.handleClick
		});
		LandkreisJSON.addEventListener('add', layerLoaded);
		LandkreisJSON.addTo(map);
	}
};

const pullDEU = async () => {
	[Landkreise, result] = await downloadMapJSON('DEU');
	Landkreise.features.sort((item1, item2) => parseInt(item1.properties.RS, 10) - parseInt(item2.properties.RS, 10));
	Landkreise.features.forEach((Lk, index) => {
		Object.assign(Lk.properties, result.NUTS3[index]);
		Lk.properties.BEZ_GEN = Lk.properties.BEZ + ' ' + Lk.properties.GEN;
	});
	bundeslaenderDataDEU = result.NUTS2;
	NUTS1Data.DE = result.NUTS1;
	casesDEU.lastUpdate = result.lastUpdate.cases;
	vacDEU.lastUpdate = result.lastUpdate.vac;
};
