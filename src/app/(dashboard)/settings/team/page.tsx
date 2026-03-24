"use client";

import { TeamSettings } from "@/components/team/team-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Shield, 
  Crown, 
  Settings, 
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { TeamRole, ROLES_INFO, PERMISSION_MATRIX } from "@/lib/auth/roles";
import { PERMISSIONS_INFO, CATEGORY_LABELS, PermissionCategory } from "@/lib/auth/permissions";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-500" />
          Gestion d&apos;équipe
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gérez les membres de votre équipe et leurs permissions
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Équipe</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Rôles</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamSettings />
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="grid gap-6 md:grid-cols-2">
            {(Object.keys(ROLES_INFO) as TeamRole[]).map((role) => {
              const info = ROLES_INFO[role];
              return (
                <Card key={role}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${info.color} flex items-center justify-center`}>
                        {role === 'owner' && <Crown className="h-5 w-5 text-white" />}
                        {role === 'admin' && <Shield className="h-5 w-5 text-white" />}
                        {role === 'manager' && <Users className="h-5 w-5 text-white" />}
                        {role === 'agent' && <Users className="h-5 w-5 text-white" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{info.label}</CardTitle>
                        <CardDescription>{info.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Permissions ({info.permissions.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {info.permissions.slice(0, 6).map((permission) => (
                          <Badge 
                            key={permission} 
                            variant="outline" 
                            className="text-xs"
                          >
                            {PERMISSIONS_INFO[permission]?.label || permission}
                          </Badge>
                        ))}
                        {info.permissions.length > 6 && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-gray-100 dark:bg-gray-800"
                          >
                            +{info.permissions.length - 6} autres
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Matrice des permissions</CardTitle>
              <CardDescription>
                Vue détaillée des permissions pour chaque rôle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">Permission</th>
                      <th className="text-center py-3 px-4">
                        <Badge className="bg-purple-500">Propriétaire</Badge>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Badge className="bg-blue-500">Admin</Badge>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Badge className="bg-green-500">Manager</Badge>
                      </th>
                      <th className="text-center py-3 px-4">
                        <Badge className="bg-gray-500">Agent</Badge>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PERMISSION_MATRIX).map(([permission, roles]) => (
                      <tr key={permission} className="border-b dark:border-gray-800">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">
                              {PERMISSIONS_INFO[permission as keyof typeof PERMISSIONS_INFO]?.label || permission}
                            </p>
                            <p className="text-xs text-gray-500">
                              {PERMISSIONS_INFO[permission as keyof typeof PERMISSIONS_INFO]?.description}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          {roles.owner ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {roles.admin ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {roles.manager ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {roles.agent ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Team Limits Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Limites par plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">Starter</h4>
                  <p className="text-2xl font-bold text-orange-500">1</p>
                  <p className="text-sm text-gray-500">utilisateur</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">Business</h4>
                  <p className="text-2xl font-bold text-orange-500">3</p>
                  <p className="text-sm text-gray-500">utilisateurs</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">Enterprise</h4>
                  <p className="text-2xl font-bold text-orange-500">∞</p>
                  <p className="text-sm text-gray-500">utilisateurs illimités</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
