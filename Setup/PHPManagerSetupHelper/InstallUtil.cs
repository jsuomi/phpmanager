//-----------------------------------------------------------------------
// <copyright>
// Copyright (C) Ruslan Yakushev for the PHP Manager for IIS project.
//
// This file is subject to the terms and conditions of the Microsoft Public License (MS-PL).
// See http://www.microsoft.com/opensource/licenses.mspx#Ms-PL for more details.
// </copyright>
//----------------------------------------------------------------------- 

using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Web.Administration;

namespace Web.Management.PHP.Setup
{

    public static class InstallUtil
    {

        public static void AddUIModuleProvider(string name, string type)
        {
            using (var mgr = new ServerManager())
            {

                // First register the Module Provider  
                var adminConfig = mgr.GetAdministrationConfiguration();

                var moduleProvidersSection = adminConfig.GetSection("moduleProviders");
                var moduleProviders = moduleProvidersSection.GetCollection();
                if (FindByAttribute(moduleProviders, "name", name) == null)
                {
                    var moduleProvider = moduleProviders.CreateElement();
                    moduleProvider.SetAttributeValue("name", name);
                    moduleProvider.SetAttributeValue("type", type);
                    moduleProviders.Add(moduleProvider);
                }

                // Now register it so that all Sites have access to this module 
                var modulesSection = adminConfig.GetSection("modules");
                var modules = modulesSection.GetCollection();
                if (FindByAttribute(modules, "name", name) == null)
                {
                    var module = modules.CreateElement();
                    module.SetAttributeValue("name", name);
                    modules.Add(module);
                }

                mgr.CommitChanges();
            }
        }

        /// <summary> 
        /// Helper method to find an element based on an attribute 
        /// </summary> 
        private static ConfigurationElement FindByAttribute(IEnumerable<ConfigurationElement> collection, string attributeName, string value)
        {
            return collection.FirstOrDefault(element => String.Equals((string) element.GetAttribute(attributeName).Value, value, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Unregisters every PHP version from IIS. Removes the FastCGI handler mappings for *.php
        /// on the server, in the location paths of applicationHost.config and in each site's
        /// root web.config, then the FastCGI applications those mappings used.
        /// PHP files are not touched.
        /// </summary>
        public static void RemovePHPRegistrations()
        {
            using (var mgr = new ServerManager())
            {
                var executables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var appHostConfig = mgr.GetApplicationHostConfiguration();

                RemovePHPHandlers(appHostConfig.GetSection("system.webServer/handlers"), executables);
                foreach (var locationPath in appHostConfig.GetLocationPaths())
                {
                    if (!String.IsNullOrEmpty(locationPath))
                    {
                        RemovePHPHandlers(appHostConfig.GetSection("system.webServer/handlers", locationPath), executables);
                    }
                }

                foreach (var site in mgr.Sites)
                {
                    try
                    {
                        RemovePHPHandlers(mgr.GetWebConfiguration(site.Name).GetSection("system.webServer/handlers"), executables);
                    }
                    catch (Exception)
                    {
                        // The site's web.config may be unreadable, or not allowed to define handlers.
                    }
                }

                var fastCgiApplications = appHostConfig.GetSection("system.webServer/fastCgi").GetCollection();
                var unusedApplications = fastCgiApplications
                    .Where(application => executables.Contains((string)application.GetAttributeValue("fullPath")))
                    .ToList();
                foreach (var application in unusedApplications)
                {
                    fastCgiApplications.Remove(application);
                }

                mgr.CommitChanges();
            }
        }

        // Removes the *.php FastCGI handler mappings defined at this level, and collects their executables.
        private static void RemovePHPHandlers(ConfigurationSection section, ISet<string> executables)
        {
            var handlers = section.GetCollection();
            var phpHandlers = handlers
                .Where(handler => handler.IsLocallyStored &&
                    String.Equals((string)handler.GetAttributeValue("path"), "*.php", StringComparison.OrdinalIgnoreCase) &&
                    String.Equals((string)handler.GetAttributeValue("modules"), "FastCgiModule", StringComparison.OrdinalIgnoreCase))
                .ToList();
            foreach (var handler in phpHandlers)
            {
                var scriptProcessor = (string)handler.GetAttributeValue("scriptProcessor") ?? String.Empty;
                executables.Add(Environment.ExpandEnvironmentVariables(scriptProcessor.Split('|')[0]));
                handlers.Remove(handler);
            }
        }

        /// <summary>
        /// Removes the specified UI Module by name
        /// </summary>
        public static void RemoveUIModuleProvider(string name)
        {
            using (var mgr = new ServerManager())
            {
                // First remove it from the sites 
                var adminConfig = mgr.GetAdministrationConfiguration();
                var modulesSection = adminConfig.GetSection("modules");
                var modules = modulesSection.GetCollection();
                var module = FindByAttribute(modules, "name", name);
                if (module != null)
                {
                    modules.Remove(module);
                }

                // now remove the ModuleProvider 
                var moduleProvidersSection = adminConfig.GetSection("moduleProviders");
                var moduleProviders = moduleProvidersSection.GetCollection();
                var moduleProvider = FindByAttribute(moduleProviders, "name", name);
                if (moduleProvider != null)
                {
                    moduleProviders.Remove(moduleProvider);
                }

                mgr.CommitChanges();
            }
        }
    }
}
