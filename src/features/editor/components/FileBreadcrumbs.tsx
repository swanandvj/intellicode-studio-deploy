import React from "react";
import { FileIcon } from "@react-symbols/icons/utils";

import { useFilePath } from "@/features/projects/hooks/use-files";
import { useEditor } from "@/features/editor/hooks/use-editor";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Id } from "../../../../convex/_generated/dataModel";

export const FileBreadcrumbs = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const { activeTabId } = useEditor(projectId);
  const filePath = useFilePath(activeTabId);
  

  if (filePath === undefined || !activeTabId) {
    return (
      <div className="h-10 flex items-center bg-background border-b pl-4">
        <Breadcrumb>
          <BreadcrumbList className="flex items-center gap-1">
            <BreadcrumbItem className="flex items-center text-sm">
              <BreadcrumbPage>&nbsp;</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  return (
    <div className="h-10 flex items-center bg-background border-b pl-4">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center gap-1">
          {filePath.map((item, index) => {
            const isLast = index === filePath.length - 1;

            return (
              <React.Fragment key={item._id}>
                <BreadcrumbItem className="flex items-center text-sm">
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1.5 leading-none">
                      <FileIcon
                        fileName={item.name}
                        autoAssign
                        className="size-4 shrink-0"
                      />
                      <span>{item.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      className="flex items-center leading-none"
                    >
                      {item.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>

                {!isLast && (
                  <BreadcrumbSeparator className="flex items-center" />
                )}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};