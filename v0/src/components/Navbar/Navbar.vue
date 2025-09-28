<template>
    <nav v-if="!simulatorMobileStore.showMobileView" class="navbar navbar-expand-lg navbar-dark header">
        <Logo :cvlogo="navbarLogo" />

        <div
            v-if="!simulatorMobileStore.showMobileView"
            id="bs-example-navbar-collapse-1"
            class="collapse navbar-collapse"
        >
            <NavbarLinks :navbar-data="navbarData" />

            <!-- smaller input field -->
            <div class="input-group mb-3 ml-3" style="max-width: 250px; padding-top: 1vh;">
                <input                    
                    type="text"                    
                    class="form-control form-control-sm"                    
                    placeholder="Enter circuit ID to collaborate"
                    v-model="shareId"
                />
                <button class="btn btn-outline-secondary btn-sm" @click="startCollab(shareId)">
                    Collab
                </button>
            </div>

            <!-- show number of active collaborators -->
            <span class="active-collaborators" style="margin-left: 1rem; color: white;">
                <!-- show self if 0  -->
                <!-- 0 -> not connected to server -->
                <!-- 1 -> only self -->
                Active: {{ collabProjectStore.getCollaborators.length }}
            </span>

            <span
                id="projectName"
                class="projectName noSelect defaultCursor font-weight-bold"
            >
                {{ promptStore.getProjectName }}
            </span>
            <UserMenu class="useMenuBtn" />
        </div>
    </nav>
    <QuickButton v-if="!simulatorMobileStore.showMobileView" />
</template>

<script lang="ts" setup>

import { startCollab } from '../../simulator/src/data/collabProject'
import { useCollabProjectStore } from '#/store/collabProjectStore'

import QuickButton from '@/Navbar/QuickButton/QuickButton.vue'
import User from '@/Navbar/User/User.vue'
import NavbarLinks from '@/Navbar/NavbarLinks/NavbarLinks.vue'
import { useSimulatorMobileStore } from '#/store/simulatorMobileStore'

import navbarData from '#/assets/constants/Navbar/NAVBAR_DATA.json'
import userDropdownItems from '#/assets/constants/Navbar/USER_DATA.json'

import Logo from '@/Logo/Logo.vue'
import Hamburger from '@/Navbar/Hamburger/Hamburger.vue'
import Hamburger2 from './Hamburger/Hamburger2.vue'
import UserMenu from './User/UserMenu.vue'
import { ref } from 'vue'
import { usePromptStore } from '#/store/promptStore'


const navbarLogo = ref('logo')
const promptStore = usePromptStore()
const simulatorMobileStore = useSimulatorMobileStore()
const collabProjectStore = useCollabProjectStore()

</script>

<style scoped>
@import './Navbar.css';

.useMenuBtn {
    margin: 0 2rem 0 auto;
}
</style>
