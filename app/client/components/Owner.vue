<template>
    <div>
        <h2>Owner Control Panel</h2>
        <p>Current status: {{$parent.user.status.name.toUpperCase()}}<br>Logged in as: {{$parent.user.fullName}}</p>
    </div>
</template>

<script>
    /*
    import Session from '../src/Session'

    export default {
        data() {

        }
    }*/
</script>