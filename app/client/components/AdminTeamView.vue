<template>
    <div style="width: 100%">
        <div class="organizer-card">
            <div class="ui-card dash-card-large">
            <h3>Team Name: {{teamObj.name}}</h3>

            <div style="overflow-x: auto; max-width: 100%">
                <table class='data-table-generic'>
                    <tr class='table-header'>
                        <td>NAME</td>
                        <td>ADMISSION STATUS</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr v-for="member in teamObj.memberNames">
                        <td>{{member.name}}</td>
                        <td>{{member.admissionState}}</td>
                        <td>
                            <router-link :to="{path: '/organizer/userview?username='+member.id+'&returnPath=/organizer/teamview', params: {username: member.id}}">
                                <button class="generic-button-dark less-wide">View</button>
                            </router-link>
                        </td>
                        <td><button class="generic-button-dark less-wide" v-on:click="removeUser(member)">Remove</button></td>
                    </tr>
                </table>
            </div>

            <!--
            <div id="detailed-info" style="column-count: 2; column-width: 300px;">
                <ul style="list-style: none">
                    <li v-for="member in teamMembers" style="overflow-wrap: break-word; text-align: left;">
                        <router-link :to="{path: '/organizer/userview?username='+member.id+'&returnPath=/organizer/teamview', params: {username: member.id}}">
                            {{member.name}}
                        </router-link>
                        <i class="fa fa-times" style="color:red" v-on:click="removeUser(member)"></i>
                    </li>
                </ul>

            </div>-->
                <div v-if="user.permissions.owner">
                    <hr>

                    <router-link :to="{path: returnPath}"><button class="generic-button-dark less-wide">Back</button></router-link>
                    <button class="generic-button-dark less-wide" v-on:click="acceptTeam">Force Admit</button>
                    <button class="generic-button-dark less-wide" v-on:click="rejectTeam">Force Reject</button>

                    <button class="generic-button-dark less-wide" v-on:click="deleteTeam">Delete Team</button>
                </div>
        </div>
        </div>
    </div>
</template>

<script type="text/javascript">
    import Session from '../src/Session'
    import swal from 'sweetalert2'
    import ApiService from '../src/ApiService.js'

    export default {
        data() {
            return {
                user: Session.getUser(),
                error : '',
                teamCode: '',
                teamObj: [],
                teamMembers: [],
                returnPath: "/organizer/teamview",
            }
        },

        beforeMount() {
            if (this.$route.query["returnPath"]) {
                this.returnPath = this.$route.query["returnPath"]
            }

            this.teamCode = this.$route.query["code"];
            ApiService.getTeamByCode(this.teamCode, (err, data) => {
                if (err || !data) {
                    console.log("ERROR")
                } else {
                    console.log("data2");
                    this.teamObj = data;
                    this.teamMembers = data.memberNames;
                }
            })
        },

        mounted() {

        },

        methods: {
            removeUser(user) {
                swal({
                    title: 'Warning',
                    type: 'warning',
                    text: 'This action is irreversible! Are you sure you want to delete ' + user.name +' from this team (If this is the last member, the team will be deleted as well)',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes!'
                }).then((result) => {
                    if (result.value) {
                        swal.showLoading();

                        ApiService.removeFromTeam(user.id, this.teamCode, (err, data) => {
                            if (err) {
                                swal({
                                    title: "Warning",
                                    type: 'danger',
                                    text: 'Unable to remove user'
                                })
                            } else {
                                swal({
                                    title: "Success",
                                    type: 'success',
                                    text: 'User has been removed'
                                }).then(() => {
                                    if (data.message) {
                                        this.$router.push({path: this.returnPath});
                                    } else {
                                        for (let i = 0; i < this.teamMembers.length; i++) {
                                            if (this.teamMembers[i] === user) {
                                                this.$delete(this.teamMembers, i);
                                                break
                                            }
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            },
            deleteTeam() {
                swal({
                    title: 'Warning',
                    type: 'warning',
                    text: 'This action is irreversible! Are you sure you want to delete this team',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes!'
                }).then((result) => {
                    if (result.value) {
                        swal.showLoading();

                        ApiService.deleteTeam(this.teamCode, (err, data) => {
                            if (err) {
                                swal({
                                    title: "Warning",
                                    type: 'danger',
                                    text: 'Unable to delete team'
                                })
                            } else {
                                swal({
                                    title: "Success",
                                    type: 'success',
                                    text: 'Team has been deleted'
                                }).then(() => {
                                    this.$router.push({path: this.returnPath});
                                })
                            }
                        })
                    }
                })
            },
            acceptTeam() {
                swal({
                    title: 'Warning',
                    type: 'warning',
                    text: 'Are you sure you want to admit this team',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes!'
                }).then((result) => {
                    if (result.value) {
                        swal.showLoading();

                        ApiService.acceptTeam(this.teamCode, (err, data) => {
                            if (err) {
                                swal({
                                    title: "Warning",
                                    type: 'danger',
                                    text: 'Unable to admit team'
                                })
                            } else {
                                swal({
                                    title: "Success",
                                    type: 'success',
                                    text: 'Team has been admitted'
                                })
                            }
                        })
                    }
                })
            },
            rejectTeam() {
                swal({
                    title: 'Warning',
                    type: 'warning',
                    text: 'Are you sure you want to reject this team',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes!'
                }).then((result) => {
                    if (result.value) {
                        swal.showLoading();

                        ApiService.rejectTeam(this.teamCode, (err, data) => {
                            if (err) {
                                swal({
                                    title: "Warning",
                                    type: 'danger',
                                    text: 'Unable to reject team'
                                })
                            } else {
                                swal({
                                    title: "Success",
                                    type: 'success',
                                    text: 'Team has been rejected'
                                })
                            }
                        })
                    }
                })
            }

        }

    }
</script>
