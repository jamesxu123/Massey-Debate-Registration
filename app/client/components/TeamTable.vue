<template>
    <div style="width: 100%">
        <div class="organizer-card">
            <div class="ui-card dash-card-large">
                <!--<h3>USERS:</h3>-->
                <div v-if="loading">
                    Loading...
                </div>
                <div v-else-if="err">
                    {{loadingError}}
                </div>
                <div v-else>
                    <input style="width: 100%" class="" v-on:input="updateSearch" v-model="searchQuery" type="text">

                    <div v-if="advancedQuery">
                        <textarea v-model="advancedQueryContent" v-on:input="updateAdvancedFilter"
                                  placeholder="Enter query here"></textarea>
                    </div>
                    <div class="filterEntry" v-else>
                        <select class=" first wide" v-model="queryLogical">
                            <option value="$and">and</option>
                            <option value="$or">or</option>
                            <option value="$not">not</option>
                            <option value="$nor">nor</option>
                        </select>

                        <!-- Field Name -->
                        <select class=" middle wide" v-model="queryField" v-on:change="changeFieldName">
                            <option v-bind:value="{}">Select a field</option>
                            <option v-for="field in fields" v-bind:value="field">{{prettify(field.name)}}</option>
                        </select>

                        <select class=" middle wide" v-model="queryComparison" :disabled="!queryField.name">
                            <option value="$eq" :disabled="queryField.type=='Boolean'">equal</option>
                            <option value="$ne" :disabled="queryField.type=='Boolean'">not equal</option>
                            <option value="$regex" :disabled="queryField.type!='String'">contains (regex)</option>
                            <option value="$gt" :disabled="queryField.type=='Boolean'">greater than</option>
                            <option value="$gte" :disabled="queryField.type=='Boolean'">greater than or equal</option>
                            <option value="$lt" :disabled="queryField.type=='Boolean'">less than</option>
                            <option value="$lte" :disabled="queryField.type=='Boolean'">less than or equal</option>

                            <option value="true" :disabled="queryField.type!='Boolean'">True</option>
                            <option value="false" :disabled="queryField.type!='Boolean'">False</option>
                        </select>

                        <input class=" last wide" v-model="queryTargetValue" type="text"
                               :disabled="(queryField && queryField.type=='Boolean') || !queryField.name">
                    </div>

                    <br>
                    <button class="generic-button-dark wide" v-on:click="addQuery" :disabled="!queryField.name">Add</button>
                    <button class="generic-button-dark wide" v-on:click="clearQuery">Clear</button>
                    <button class="generic-button-dark wide" v-on:click="advancedQuery = !advancedQuery">{{advancedQuery ?
                        "Simple" : "Advanced"}} Query
                    </button>

                    <br>

                    <div style="overflow-x: auto; max-width: 100%">
                        <table class="data-table-generic" v-for="(comparison, logical) in filters">
                            <tr class="table-header">
                                <td>TYPE</td>
                                <td>CONDITION</td>

                            </tr>
                            <tr v-for="filter in comparison">

                                <td style="letter-spacing: normal !important;">{{logical.slice(1).toUpperCase()}}</td>

                                <td>{{prettify(Object.keys(filter)[0])}}: {{filter[Object.keys(filter)[0]]}}</td>

                                <td>
                                    <button class="generic-button-dark" style="margin-left: auto; margin-right: auto"
                                            v-on:click="deleteFilter(logical, filter)">Delete
                                    </button>
                                </td>

                            </tr>
                        </table>
                    </div>

                    <div v-if="teams.length !== 0 && !queryError">
                        <hr>
                        <button class="generic-button-dark wide" v-on:click="exportUsersCSV">Export</button>
                        <button class="generic-button-dark wide" :disabled="page == 1" v-on:click="switchPage(page - 1)">
                            Previous
                        </button>
                        <button class="generic-button-dark wide" :disabled="page == totalPages"
                                v-on:click="switchPage(page + 1)">Next
                        </button>

                        <br>
                        <br>
                        {{page}} of {{totalPages}} | {{count}} result<span v-if="count > 1">s</span>

                        <hr>

                        <div style="overflow-x: auto; max-width: 100%">
                            <table class="data-table-generic">
                                <tr class="table-header">
                                    <td><a class="sortable" @click="sortBy('name')">NAME</a></td>
                                    <td>Members</td>
                                    <td>Count</td>
                                    <td>Code</td>
                                </tr>
                                <router-link v-for="team in teams"
                                             :to="{path: '/organizer/teammanage?code='+team.code+'&returnPath=/organizer/teamview', params: {code: team.code}}"
                                             tag="tr">
                                    <td>
                                        {{team.name}}
                                    </td>
                                    <td style="align-items: center">
                                        <router-link v-for="user in team.memberNames"
                                                     :to="{path: '/organizer/userview?username='+user[1]+'&returnPath=/organizer/teamview', params: {username: user[1]}}">
                                            {{user[0]}}<br>
                                        </router-link>
                                    </td>
                                    <td>
                                        {{team.memberNames.length}}/{{settings.maxMembers}}
                                    </td>
                                    <td>
                                        {{team.code}}
                                    </td>
                                </router-link>
                            </table>
                        </div>
                    </div>
                    <p v-else>
                        <br>
                        {{queryError}}
                    </p>

                </div>
            </div>
        </div>
        <vue-context ref="menu" style="position: absolute;">
            <ul>
                <li @click="onClick($event.target.innerText, child.data)">Option 1</li>
                <li @click="onClick($event.target.innerText, child.data)">Option 2</li>
            </ul>
        </vue-context>
    </div>
</template>

<script>
    import Session from '../src/Session'
    import ApiService from '../src/ApiService'
    import {saveAs} from 'file-saver/FileSaver'
    import swal from 'sweetalert2'
    import {VueContext} from 'vue-context'

    export default {
        data() {
            return {
                page: 1,
                totalPages: 1,
                count: 0,

                displayOrganizers: false,
                advancedQueryContent: '{}',
                filters: {},
                searchQuery: '',

                fields: {},
                queryField: {},
                queryLogical: '$and', // and, or, not, nor
                queryComparison: '$eq', // equals, contains, greater, less, greater or equal, lesser or equal, not include, not in array
                queryTargetValue: '', // 5 apples
                advancedQuery: false,

                loading: true,
                loadingError: '',
                queryError: '',

                currentSorting: '',
                reverseSorted: true,

                teams: {},

                settings: Session.getSettings()
            }
        },

        beforeMount() {
            // Get fields for filters
            ApiService.getTeamFields((err, data) => {
                if (err || !data) {
                    this.loadingError = err ? err.responseJSON.error : 'Unable to process request'
                } else {
                    this.fields = data
                }
            });

            ApiService.getTeams({page: this.page, size: 100, filters: this.filters}, (err, data) => {
                this.loading = false;

                if (err || !data) {
                    this.loadingError = err ? err.responseJSON.error : 'Unable to process request'
                } else {
                    this.teams = data.teams;
                    this.totalPages = data.totalPages;
                    this.count = data.count;

                    if (this.teams.length == 0) {
                        this.queryError = 'No teams found'
                    }
                }
            })
        },

        components: {
            VueContext
        },

        methods: {

            prettify: function (str) {
                var strProc = str;
                if (str.indexOf('.') != -1) {
                    strProc = str.slice(str.indexOf('.') + 1)
                }
                return strProc.replace(/([A-Z])/g, ' $1').replace(/^./, function (strProc) {
                    return strProc.toUpperCase();
                })
            },

            sortBy: function (field) {
                var sort = {};

                if (this.currentSorting === field) {
                    this.reverseSorted = !this.reverseSorted
                } else {
                    this.currentSorting = field;
                    this.reverseSorted = false
                }

                sort[field] = this.reverseSorted === false ? -1 : 1;

                ApiService.getTeam({page: this.page, size: 100, filters: this.filters, sort: sort}, (err, data) => {
                    this.loading = false;

                    if (err || !data) {
                        this.loadingError = err ? err.responseJSON.error : 'Unable to process request'
                    } else {
                        this.teams = data.teams;
                        this.totalPages = data.totalPages;
                        this.count = data.count;

                        if (this.teams.length == 0) {
                            this.queryError = 'No users found'
                        }
                    }
                })
            },

            onClick: function (text, data) {
                swal('Hello')
            },

            deleteFilter: function (logical, filter) {
                this.filters[logical].splice(this.filters[logical].indexOf(filter), 1);
                this.updateSearch()
            },

            // Changes comparison operator to valid state
            changeFieldName: function () {
                switch (this.queryField.type) {
                    case "Boolean": // Only true/false are valid in this case
                        if (['true', 'false'].indexOf(this.queryComparison) == -1) {
                            this.queryComparison = 'true';
                            this.queryTargetValue = ''
                        }

                        break;
                    case "Number": // Regex cannot be used with numbers
                        if (this.queryComparison == '$regex') {
                            this.queryComparison = '$eq'
                        }

                        break;
                    default: // Strings
                        if (['true', 'false'].indexOf(this.queryComparison) != -1) {
                            this.queryComparison = '$eq'
                        }
                }
            },

            resetQuery: function () {
                this.queryLogical = '$and';
                this.queryComparison = this.queryField.type == 'Boolean' ? 'true' : '$eq';
                this.queryTargetValue = ''
            },

            addQuery: function () {

                var query = {};
                var subQuery = {};

                // Make it case insensitive
                if (this.queryComparison == '$regex') {
                    subQuery['$options'] = 'i'
                }

                // Generate inner query <'$eq':'foo'>
                subQuery[this.queryComparison] = this.queryTargetValue;

                // Generate outer query <'firstName':subQuery>
                query[this.queryField.name] = this.queryField.type == 'Boolean' ? this.queryComparison : subQuery;

                if (this.queryLogical in this.filters) {
                    if (!this.filters[this.queryLogical].map(x => JSON.stringify(x)).includes(JSON.stringify(query))) { // Figure out why this doesn't work
                        this.filters[this.queryLogical].push(query)
                    } else {
                        swal('This filter already exists!')
                    }
                } else {
                    this.filters[this.queryLogical] = [query]
                }

                this.updateSearch();
                this.resetQuery();
                this.queryField = {}
            },

            clearQuery: function () {
                this.filters = {};
                this.updateSearch()
            },

            updateAdvancedFilter: function () {
                try {
                    this.filters = JSON.parse(this.advancedQueryContent);
                    this.updateSearch()
                } catch (e) {
                    this.queryError = 'Invalid Query'
                }
            },

            updateSearch: function (resetPage) {
                if (!resetPage) {
                    this.page = 1
                }

                // Update content of advanced query box
                this.advancedQueryContent = JSON.stringify(this.filters);

                ApiService.getTeams({
                    page: this.page,
                    size: 100,
                    text: this.searchQuery,
                    filters: this.filters
                }, (err, data) => {
                    this.queryError = '';
                    if (err || !data) {
                        this.queryError = err ? err.responseJSON.error : 'Unable to process request'
                    } else {
                        this.teams = data.teams;
                        this.totalPages = data.totalPages;
                        this.count = data.count;
                        this.loading = false;

                        if (this.teams.length == 0) {
                            this.queryError = 'No results match this query'
                        }
                    }
                })
            },

            exportUsersCSV: function () {
                ApiService.getTeams({page: 1, size: 100000, text: this.searchQuery}, (err, data) => {
                    if (err || !data) {
                        this.loadingError = err ? err.responseJSON.error : 'Unable to process request'
                    } else {
                        var csvArray = [];
                        for (var i = 0; i < data.teams.length; i++) {
                            csvArray[i] = this.flattenObject(data.teams[i]);
                        }
                        this.genCSV(csvArray);
                    }
                })
            },
            flattenObject: function (data, prefix = "", level = 0) {
                var tempObj = {};
                if (level < 6) {
                    Object.keys(data).forEach((key) => {
                        if (data[key] === Object(data[key])) {
                            //iterate again!
                            tempObj = Object.assign(tempObj, this.flattenObject(data[key], prefix + key + "/", level += 1));
                        } else {
                            //log the value
                            tempObj[prefix + key] = data[key];
                        }
                    });
                    if (prefix === "") {
                        tempObj["documentKeys"] = Object.keys(tempObj);
                    }
                    return tempObj;
                } else {
                    console.log("recursion limit reached!");
                    return {};
                }
            },
            genCSV: function (objArray) {
                var output = [];
                var headers = [];

                //get all the headers
                for (var i = 0; i < objArray.length; i++) {
                    headers = this.mergeArray(headers, objArray[i]["documentKeys"]);
                }

                output[0] = headers.toString();

                //generate the output
                for (var i = 0; i < objArray.length; i++) {
                    output[i + 1] = "";
                    for (var j = 0; j < headers.length; j++) {
                        if (objArray[i][headers[j]] !== undefined) {
                            output[i + 1] += objArray[i][headers[j]] + ",";
                        } else {
                            output[i + 1] += ",";
                        }
                    }
                    output[i + 1] = output[i + 1].slice(0, -1);
                }

                var outputStr = "";
                for (var i = 0; i < output.length; i++) {
                    outputStr += output[i] + "\n";
                }

                var filename = "Users-export-" + new Date() + ".csv";
                var blob = new Blob([outputStr], {
                    type: "text/csv;charset=utf-8"
                });

                saveAs(blob, filename);

            },
            mergeArray: function () {
                /** Courtesy of George Ruth on Stack Overflow **/
                var args = arguments;
                var hash = {};
                var arr = [];
                for (var i = 0; i < args.length; i++) {
                    for (var j = 0; j < args[i].length; j++) {
                        if (hash[args[i][j]] !== true) {
                            arr[arr.length] = args[i][j];
                            hash[args[i][j]] = true;
                        }
                    }
                }
                return arr;
            },
            userStatusConverter: function (user) {
                var repsonseArray = {
                    'V': '',
                    'S': '',
                    'A': '',
                    'C': '',
                    'W': ''
                };

                if (user.permissions.verified) {
                    repsonseArray['V'] = '<i class="fas fa-check"></i>'
                } else {
                    repsonseArray['V'] = '<i class="fas fa-ban"></i>'
                }
                if (user.status.submittedApplication) {
                    repsonseArray['S'] = '<i class="fas fa-check"></i>'
                } else {
                    repsonseArray['S'] = '<i class="fas fa-ban"></i>'
                }
                if (user.status.admitted) {
                    repsonseArray['A'] = '<i class="fas fa-check"></i>'
                } else {
                    repsonseArray['A'] = '<i class="fas fa-ban"></i>'
                }
                if (user.status.confirmed) {
                    repsonseArray['C'] = '<i class="fas fa-check"></i>'
                } else {
                    repsonseArray['C'] = '<i class="fas fa-ban"></i>'
                }
                if (user.status.waiver) {
                    repsonseArray['W'] = '<i class="fas fa-check"></i>'
                } else {
                    repsonseArray['W'] = '<i class="fas fa-ban"></i>'
                }

                var finalReponse = '';

                for (var str in repsonseArray) {
                    finalReponse += repsonseArray[str]
                }
                return finalReponse
            },

            switchPage: function (page) {
                this.page = page;
                this.updateSearch(true)
            },

            toggleNormalOnly: function () {
                if (this.filters.length > 0) {
                    if (this.filters['$and'].length > 0) {
                        this.filters['$and'][0]['permissions.checkin'] = this.displayOrganizers.toString();
                        console.log(this.displayOrganizers)
                    }
                }
                console.log(this.filters);
                this.updateSearch()
            }
        }
    }
</script>


<style>

</style>
