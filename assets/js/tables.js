const resetTableColours = bgColor => {
	var fgColor =
		0.2126 * parseInt(bgColor.substring(1,3), 16)
		+ 0.7152 * parseInt(bgColor.substring(3,5), 16)
		+ 0.0722 * parseInt(bgColor.substring(5,7), 16) > 128 ? 'rgba(0,0,0,0.87)' : 'rgba(255,255,255,0.87)';
	$('#details .mdc-data-table__header-cell, #details .mdc-data-table__cell').css({
		'background-color': bgColor,
		'color': fgColor
	});
};

const casesTableFill = toPrint => {
	$('#pop').html(toPrint.EWZ.toLocaleString());
	['7','14','28'].forEach(s => {
		[['cases', 'incidence'], ['deaths', 'mortality']].forEach(t => {
			$('#' + t[0] + s).html(toPrint[t[0] + s].toLocaleString());
			$('#' + t[1] + s).html((toPrint[t[0] + s] / toPrint.EWZ * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
		});
	});
};

const vacTableFill = toPrint => {
	$('#pop').html(toPrint.EWZ.toLocaleString());
	['', '_90', '_180'].forEach(t => ['2', '3'].forEach(s => {
		$('#dose' + s + t).html(toPrint['dose' + s + t].toLocaleString());
		$('#coverage' + s + t).html((toPrint['dose' + s + t] / toPrint.EWZ * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
	}));
};

const displayTable = (L3, L2, tabNumber) => {
	$('#regionL3').html(L3);
	$('#regionL2').html(L2);
	$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', false);

	regionChooser.activateTab(tabNumber);

	$('#regionChooser .mdc-tab').css('display', 'flex');
	$('#details tr, #regionChooser').css('visibility', 'visible');
};

const convertDate = {
	regex: new RegExp(/^(\d{4})-(\d{2})-(\d{2})/),
	fx: dateString => {
		dateArray = dateString.match(convertDate.regex);
		return new Date(Date.UTC(dateArray[1], parseInt(dateArray[2], 10) - 1, dateArray[3]));
	}
};

var regionChooser;
var sortBy;
var dataFieldSelect;

var leaderboard;
var leaderboardData;
var gChartOptions;

const drawLeaderboard = () => {
	[tableData, factor, sortColumn] = gChartOptions;
	var leaderboardListener;

	if (leaderboard !== undefined)
		leaderboard.clearChart();

	leaderboardData = new google.visualization.DataTable();
	leaderboardData.addColumn('string', 'Location');
	$.each(tableData, (_key, value) => leaderboardData.addColumn('number', value));

	[
		[LandkreisJSON, 'BEZ_GEN'],
		[DepartementJSON, 'nom'],
		[ProvinceJSON, 'prov_name'],
		[BezirkJSON, 'name'],
		[KantonJSON, 'KTNAME'],
		[LuxembourgJSON, 'name'],
		[PowiatJSON, 'JPT_NAZWA_']
	].forEach(pair => leaderboardData.addRows(Object.values(pair[0]._layers).reduce((total, L_v) => {
		unit = [];
		unit.push(L_v.feature.properties[pair[1]]),
		Object.keys(tableData).forEach(k => unit.push(L_v.feature.properties[k] / L_v.feature.properties.EWZ * factor));
		total.push(unit);
		return total;
	}, [])));

	leaderboard = new google.visualization.Table(document.getElementById('leaderboard'));
	var leaderboardView = new google.visualization.DataView(leaderboardData);

	var options = {
		allowHtml: true,
		alternatingRowStyle: false,
		cssClassNames: {
			headerRow: 'mdc-data-table__header-row',
			headerCell: 'mdc-data-table__header-cell',
			tableRow: 'mdc-data-table__row',
			tableCell: 'mdc-data-table__cell--numeric',
			selectedTableRow: 'mdc-data-table__row--selected',
			hoverTableRow: 'mdc-data-table__row--hover'
		},
		showRowNumber: true,
		page: 'enable',
		pageSize: 20,
		sortColumn: sortColumn,
		sortAscending: false
	};

	leaderboardListener = google.visualization.events.addListener(leaderboard, 'sort', props => {
		var sortValues = [];
		var sortRows = [];
		var sortDirection = (props.ascending) ? 1 : -1;

		if (props.column) {
			for (var i = 0; i < leaderboardData.getNumberOfRows(); i++)
				sortValues.push({
					index: leaderboardData.getValue(i, props.column),
					location: leaderboardData.getValue(i, 0)
				});
			sortValues.sort((row1, row2) => isNaN(row1.index) ? 1 : isNaN(row2.index) ? -1 : (row1.index - row2.index) * sortDirection);
			sortValues.forEach(sortValue => sortRows.push(leaderboardData.getFilteredRows([
				{column: props.column, value: sortValue.index},
				{column: 0, value: sortValue.location}
			])[0]));
		}
		else {
			for (var i = 0; i < leaderboardData.getNumberOfRows(); i++)
				sortValues.push({
					index: leaderboardData.getValue(i, props.column)
				});
			sortValues.sort((row1, row2) => row1.index < row2.index ? sortDirection : -sortDirection);
			sortValues.forEach(sortValue => sortRows.push(leaderboardData.getFilteredRows([
				{column: props.column, value: sortValue.index}
			])[0]));
		}
		console.log('Sorted Row Order: ' + sortRows);

		leaderboardView.setRows(sortRows);
		options.sortColumn = props.column;
		options.sortAscending = props.ascending;

		leaderboard.draw(leaderboardView, options);
	});

	leaderboard.draw(leaderboardView, options);

	$('#leaderboard table td:nth-child(2)').removeClass('mdc-data-table__cell--numeric').addClass('mdc-data-table__cell');
};

$(() => {
	sortBy = mdc.list.MDCList.attachTo(document.querySelector('#sortBy ul'));
	const sortByRipples = sortBy.listElements.map(el => new mdc.ripple.MDCRipple(el));

	var currentSelectedSort = sortBy.selectedIndex;
	document.querySelector('#sortBy ul').addEventListener('MDCList:action', event => {
		if (event.detail.index != currentSelectedSort) {
			if (event.detail.index) {
				['cases-details', 'vaccine-details'].forEach(id => {
					$(`#${id} tr:nth-child(4)`).insertAfter(`#${id} tr:nth-child(1)`);
					$(`#${id} tr:nth-child(5)`).insertAfter(`#${id} tr:nth-child(3)`);
				});
			}
			else {
				['cases-details', 'vaccine-details'].forEach(id => {
					$(`#${id} tr:nth-child(4)`).insertAfter(`#${id} tr:nth-child(5)`);
					$(`#${id} tr:nth-child(2)`).insertAfter(`#${id} tr:nth-child(4)`);
				});
			}
		}
		currentSelectedSort = event.detail.index;
	});

	gChartOptions = [{
		cases7: '7-day Incidence',
		cases14: '14-day Incidence',
		cases28: '28-day Incidence',
		deaths7: '7-day Mortality',
		deaths14: '14-day Mortality',
		deaths28: '28-day Mortality'
	}, 100000, 1];
});
