﻿//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:2.0.50727.5444
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace Web.Management.PHP.Powershell {
    using System;
    
    
    /// <summary>
    ///   A strongly-typed resource class, for looking up localized strings, etc.
    /// </summary>
    // This class was auto-generated by the StronglyTypedResourceBuilder
    // class via a tool like ResGen or Visual Studio.
    // To add or remove a member, edit your .ResX file then rerun ResGen
    // with the /str option, or rebuild your VS project.
    [global::System.CodeDom.Compiler.GeneratedCodeAttribute("System.Resources.Tools.StronglyTypedResourceBuilder", "2.0.0.0")]
    [global::System.Diagnostics.DebuggerNonUserCodeAttribute()]
    [global::System.Runtime.CompilerServices.CompilerGeneratedAttribute()]
    internal class Resources {
        
        private static global::System.Resources.ResourceManager resourceMan;
        
        private static global::System.Globalization.CultureInfo resourceCulture;
        
        [global::System.Diagnostics.CodeAnalysis.SuppressMessageAttribute("Microsoft.Performance", "CA1811:AvoidUncalledPrivateCode")]
        internal Resources() {
        }
        
        /// <summary>
        ///   Returns the cached ResourceManager instance used by this class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Resources.ResourceManager ResourceManager {
            get {
                if (object.ReferenceEquals(resourceMan, null)) {
                    global::System.Resources.ResourceManager temp = new global::System.Resources.ResourceManager("Web.Management.PHP.Powershell.Resources", typeof(Resources).Assembly);
                    resourceMan = temp;
                }
                return resourceMan;
            }
        }
        
        /// <summary>
        ///   Overrides the current thread's CurrentUICulture property for all
        ///   resource lookups using this strongly typed resource class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Globalization.CultureInfo Culture {
            get {
                return resourceCulture;
            }
            set {
                resourceCulture = value;
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Extension with name &quot;{0}&quot; does not exist..
        /// </summary>
        internal static string ErrorExtensionDoesNotExist {
            get {
                return ResourceManager.GetString("ErrorExtensionDoesNotExist", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to PHP handler with name &quot;{0}&quot; does not exist..
        /// </summary>
        internal static string ErrorHandlerDoesNotExist {
            get {
                return ResourceManager.GetString("ErrorHandlerDoesNotExist", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The provided path should point to either php-cgi.exe or php.exe..
        /// </summary>
        internal static string ErrorInvalidPHPExecutablePath {
            get {
                return ResourceManager.GetString("ErrorInvalidPHPExecutablePath", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The directory does not contain ext subdirectory with PHP extensions..
        /// </summary>
        internal static string ErrorNoExtDirectory {
            get {
                return ResourceManager.GetString("ErrorNoExtDirectory", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The directory does not contain required PHP file: php-cgi.exe and php.ini..
        /// </summary>
        internal static string ErrorNoPHPFilesInDirectory {
            get {
                return ResourceManager.GetString("ErrorNoPHPFilesInDirectory", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The php.ini file cannot be found. Make sure PHP is correctly registered with IIS..
        /// </summary>
        internal static string ErrorPHPIniNotFound {
            get {
                return ResourceManager.GetString("ErrorPHPIniNotFound", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to PHP is not registered properly. Use New-Version cmdlet to register PHP with IIS..
        /// </summary>
        internal static string ErrorPHPIsNotRegistered {
            get {
                return ResourceManager.GetString("ErrorPHPIsNotRegistered", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Setting with name {0} does not exist. Use New-PHPSetting cmdlet to add a new setting..
        /// </summary>
        internal static string ErrorSettingDoesNotExist {
            get {
                return ResourceManager.GetString("ErrorSettingDoesNotExist", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to You do not have permission to view or modify IIS configuration. 
        ///Is PowerShell console launched in elevated mode (Run As Administrator)?.
        /// </summary>
        internal static string ErrorUserIsNotAdmin {
            get {
                return ResourceManager.GetString("ErrorUserIsNotAdmin", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to &lt;Not set&gt;.
        /// </summary>
        internal static string NotSetValue {
            get {
                return ResourceManager.GetString("NotSetValue", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to A PowerShell snapin for managing PHP installations on IIS 7..
        /// </summary>
        internal static string SnapInDescription {
            get {
                return ResourceManager.GetString("SnapInDescription", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to PHP Manager Project.
        /// </summary>
        internal static string SnapInVendor {
            get {
                return ResourceManager.GetString("SnapInVendor", resourceCulture);
            }
        }
    }
}
